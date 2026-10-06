import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import lockfile from "proper-lockfile";
import { initialStore, type Store } from "./types.ts";

export const STORE_KEY = "tallies.store.v1";
export const SELECTED_TEMPLATE_KEY = "tallies.selectedTemplateId";

type Storage = {
  getItem(key: string): Promise<unknown>;
  setItem(key: string, value: string): Promise<unknown>;
};

export function createStorePersistence(storage: Storage, lockPath: string, onSave?: (store: Store) => void) {
  async function guarded<T>(operation: () => Promise<T>): Promise<T> {
    await mkdir(dirname(lockPath), { recursive: true });
    // A module-level queue would not protect separate Raycast command processes.
    const release = await lockfile.lock(lockPath, {
      realpath: false,
      retries: { retries: 60, factor: 1, minTimeout: 250, maxTimeout: 250 },
    });
    try {
      return await operation();
    } finally {
      await release();
    }
  }

  async function readUnlocked(): Promise<Store> {
    const raw = await storage.getItem(STORE_KEY);
    const stored: Store = raw ? JSON.parse(String(raw)) : initialStore();
    if (
      stored.version !== 1 ||
      !Array.isArray(stored.entries) ||
      !Array.isArray(stored.templates) ||
      !stored.templates.some((template) => template.id === stored.selectedTemplateId)
    ) {
      throw new Error("Saved data is invalid. It has not been overwritten.");
    }
    // Initialization also participates in the lock, so it cannot overwrite a save.
    if (!raw) await storage.setItem(STORE_KEY, JSON.stringify(stored));
    return stored;
  }

  return {
    read: () => guarded(readUnlocked),
    update: (update: (store: Store) => Store) =>
      guarded(async () => {
        const next = update(await readUnlocked());
        await storage.setItem(STORE_KEY, JSON.stringify(next));
        await storage.setItem(SELECTED_TEMPLATE_KEY, next.selectedTemplateId);
        onSave?.(next);
        return next;
      }),
  };
}
