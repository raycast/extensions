import { useSyncExternalStore } from "react";

let isAuthenticated = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getIsAuthenticated() {
  return isAuthenticated;
}

export function setIsAuthenticated(value: boolean) {
  if (isAuthenticated === value) return;
  isAuthenticated = value;
  for (const listener of listeners) listener();
}

export function useIsAuthenticated() {
  return useSyncExternalStore(subscribe, getIsAuthenticated);
}
