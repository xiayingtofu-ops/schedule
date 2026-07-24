(function () {
  const STORAGE_KEY = "gvgUnifiedRequirementStoreV1";

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function merge(base, patch) {
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) return clone(patch);
    const result = { ...(base || {}) };
    Object.entries(patch).forEach(([key, value]) => {
      result[key] = value && typeof value === "object" && !Array.isArray(value)
        ? merge(result[key], value)
        : clone(value);
    });
    return result;
  }

  class RequirementStore {
    constructor(seed = {}) {
      this.listeners = new Set();
      this.state = merge({ version: 1, revision: 0, requirements: {}, pmRows: [] }, seed);
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        if (saved?.version === 1) this.state = merge(this.state, saved);
      } catch (_) {}
      this.persist();
    }

    getState() { return clone(this.state); }
    getRequirement(key) { return clone(this.state.requirements[key] || null); }
    getPmRows() { return clone(this.state.pmRows || []); }

    updateRequirement(key, patch, meta = {}) {
      const current = this.state.requirements[key] || { key, title: key };
      this.state.requirements[key] = merge(current, patch);
      this.commit({ type: "requirement.updated", key, patch: clone(patch), ...meta });
    }

    setRequirementField(key, field, value, meta = {}) {
      const current = this.state.requirements[key] || { key, title: key };
      current[field] = clone(value);
      this.state.requirements[key] = current;
      this.commit({ type: "requirement.updated", key, patch: { [field]: clone(value) }, ...meta });
    }

    updateRequirements(patches, meta = {}) {
      Object.entries(patches || {}).forEach(([key, patch]) => {
        const current = this.state.requirements[key] || { key, title: key };
        this.state.requirements[key] = merge(current, patch);
      });
      this.commit({ type: "requirements.updated", keys: Object.keys(patches || {}), ...meta });
    }

    replacePmRows(rows, meta = {}) {
      this.state.pmRows = clone(rows || []);
      this.commit({ type: "pmRows.replaced", ...meta });
    }

    subscribe(listener) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }

    commit(event) {
      this.state.revision += 1;
      this.state.updatedAt = new Date().toISOString();
      this.persist();
      this.listeners.forEach(listener => listener(clone(event), this.getState()));
    }

    persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    }
  }

  window.RequirementStore = RequirementStore;
})();
