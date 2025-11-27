import type { FileSystemIndex } from "../types";

class FileSystemIndexStore {
  private data: FileSystemIndex | null = null;
  private listeners = new Set<() => void>();
  get() {
    return this.data;
  }
  set(data: FileSystemIndex | null) {
    this.data = data;
    this.notify();
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

export default new FileSystemIndexStore();
