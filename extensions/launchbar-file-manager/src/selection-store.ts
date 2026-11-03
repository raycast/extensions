import { useSyncExternalStore } from "react";

// Global selection basket shared across every pushed view (browser,
// transfer tree, forms). Per-view useState would lose the selection on
// push/pop, so this module singleton survives navigation until the user
// pastes, clears, cancels, or quits the command.

let selected: string[] = [];
let version = 0;
const listeners = new Set<() => void>();

function emit() {
  version++;
  listeners.forEach((l) => l());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function getVersion(): number {
  return version;
}

export function getSelection(): string[] {
  return selected;
}

export function togglePath(fullPath: string): void {
  selected = selected.includes(fullPath)
    ? selected.filter((p) => p !== fullPath)
    : [...selected, fullPath];
  emit();
}

export function addPaths(paths: string[]): void {
  if (paths.length === 0) return;
  const set = new Set(selected);
  let changed = false;
  for (const p of paths) {
    if (!set.has(p)) {
      set.add(p);
      changed = true;
    }
  }
  if (changed) {
    selected = [...set];
    emit();
  }
}

export function removePaths(paths: string[]): void {
  if (paths.length === 0) return;
  const rm = new Set(paths);
  const next = selected.filter((p) => !rm.has(p));
  if (next.length !== selected.length) {
    selected = next;
    emit();
  }
}

/** Clears the whole basket (used after paste, cancel, or Esc out of transfer). */
export function clearAll(): void {
  if (selected.length > 0) {
    selected = [];
    emit();
  }
}

export function useGlobalSelection(): {
  selected: string[];
  toggle: (p: string) => void;
  add: (paths: string[]) => void;
  remove: (paths: string[]) => void;
  clear: () => void;
} {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  return {
    selected: getSelection(),
    toggle: togglePath,
    add: addPaths,
    remove: removePaths,
    clear: clearAll,
  };
}
