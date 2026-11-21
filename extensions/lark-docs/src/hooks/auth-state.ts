import { useSyncExternalStore } from "react";

let authenticated = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getIsAuthenticated(): boolean {
  return authenticated;
}

export function setIsAuthenticated(value: boolean): void {
  if (authenticated === value) return;
  authenticated = value;
  for (const listener of listeners) listener();
}

export function useIsAuthenticated(): boolean {
  return useSyncExternalStore(subscribe, getIsAuthenticated);
}
