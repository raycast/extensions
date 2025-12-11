class SelectionStore {
  private selected = new Set<string>();
  private listeners = new Set<() => void>();

  private version = 0;

  toggle(path: string) {
    if (this.selected.has(path)) this.selected.delete(path);
    else this.selected.add(path);
    this.emitChange();
  }

  clear() {
    this.selected.clear();
    this.emitChange();
  }

  private emitChange() {
    this.version++;
    this.notify();
  }

  getSnapshot = () => {
    return this.version;
  };

  has(path: string) {
    return this.selected.has(path);
  }
  getAll() {
    return Array.from(this.selected);
  }
  get size() {
    return this.selected.size;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => {
      l();
    });
  }
}

export default new SelectionStore();
