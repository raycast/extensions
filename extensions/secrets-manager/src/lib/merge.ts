import { randomUUID } from "node:crypto";
import type { Secret, Store } from "./types";

// Keys are JSON-encoded arrays, not joined strings: a folder segment may itself
// contain "/", so ["a/b"] and ["a","b"] must not collapse to the same key.
const folderKey = (folder: string[]) => JSON.stringify(folder);
const secretKey = (s: Secret) => JSON.stringify([...s.folder, s.name]);

// Merge imported secrets into the current ones. A secret with the same
// folder+name is overwritten (keeping the existing id, so references stay
// stable); anything else is added. Imported ids are regenerated when they
// would collide with an id already in the vault, since id is what edit and
// delete target.
export function mergeSecrets(current: Secret[], incoming: Secret[]): Secret[] {
  const byKey = new Map(current.map((s) => [secretKey(s), s]));
  const usedIds = new Set(current.map((s) => s.id));

  for (const s of incoming) {
    const key = secretKey(s);
    const existing = byKey.get(key);
    if (existing) {
      byKey.set(key, { ...s, id: existing.id });
      continue;
    }
    const id = usedIds.has(s.id) ? randomUUID() : s.id;
    usedIds.add(id);
    byKey.set(key, { ...s, id });
  }

  return [...byKey.values()];
}

export function mergeFolders(current: string[][], incoming: string[][]): string[][] {
  const byKey = new Map(current.map((f) => [folderKey(f), f]));
  for (const f of incoming) byKey.set(folderKey(f), f);
  return [...byKey.values()];
}

// Merge an imported store into the current one, returning the updated store.
export function mergeStores(current: Store, imported: Store): Store {
  return {
    ...current,
    secrets: mergeSecrets(current.secrets, imported.secrets),
    folders: mergeFolders(current.folders, imported.folders),
  };
}
