import { useSyncExternalStore } from "react";

class RefreshStore {
  #version = 0;
  #listeners = new Set<() => void>();

  triggerRefresh() {
    this.#version++;
    this.notify();
  }

  getSnapshot = () => {
    return this.#version;
  };

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  private notify() {
    this.#listeners.forEach((l) => {
      l();
    });
  }
}

export const refreshStore = new RefreshStore();

export const useRefreshSignal = () => {
  return useSyncExternalStore(refreshStore.subscribe, refreshStore.getSnapshot);
};
