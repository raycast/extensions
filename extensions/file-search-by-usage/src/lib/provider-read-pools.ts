import path from "node:path";
import { createReadPool } from "./bounded-reads";

/** Identify one mounted File Provider without treating all cloud storage as one. */
export function cloudProviderKey(fullPath: string): string | undefined {
  const normalized = path.resolve(fullPath);
  for (const folder of ["CloudStorage", "Mobile Documents"]) {
    const marker = `${path.sep}Library${path.sep}${folder}`;
    const at = normalized.indexOf(marker);
    if (at === -1) continue;
    const end = at + marker.length;
    if (normalized.length !== end && normalized[end] !== path.sep) continue;
    const rest = normalized.slice(end + 1);
    const provider = rest.split(path.sep)[0] || folder;
    return `${folder}:${provider}`;
  }
  return undefined;
}

/**
 * Select a bounded physical-read pool for a local path or one cloud provider.
 *
 * A cancelled filesystem promise may never settle and therefore keeps its
 * physical slot. Separate pools stop one stalled provider from starving local
 * paths or another provider while retaining a hard bound for each source.
 * A known cloud source can supply an isolation key when its canonical target
 * lies outside the usual File Provider folders.
 */
export function createProviderReadPoolSelector(limit = 8) {
  const local = createReadPool(limit);
  const providers = new Map<string, ReturnType<typeof createReadPool>>();

  return function readPoolFor(fullPath: string, isolationKey?: string) {
    const provider = isolationKey ?? cloudProviderKey(fullPath);
    if (provider === undefined) return local;
    let read = providers.get(provider);
    if (!read) {
      read = createReadPool(limit);
      providers.set(provider, read);
    }
    return read;
  };
}
