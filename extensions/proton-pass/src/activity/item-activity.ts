import { serializeItemReference, type ItemReference } from "../items/item";

const STORAGE_KEY = "item-activity";
export type ItemActivity = { pinned: boolean; lastUsedAt?: number };
export type ItemActivityMap = Record<string, ItemActivity>;

type Storage = {
  getItem(key: string): Promise<string | undefined>;
  setItem(key: string, value: string): Promise<void>;
};

export function createItemActivityStore(storage: Storage) {
  async function getAll(): Promise<ItemActivityMap> {
    const value = await storage.getItem(STORAGE_KEY);
    if (!value) return {};
    try {
      return JSON.parse(value) as ItemActivityMap;
    } catch {
      return {};
    }
  }
  async function save(activity: ItemActivityMap) {
    await storage.setItem(STORAGE_KEY, JSON.stringify(activity));
  }
  return {
    getAll,
    async togglePin(reference: ItemReference) {
      const all = await getAll();
      const key = serializeItemReference(reference);
      all[key] = { ...all[key], pinned: !all[key]?.pinned };
      await save(all);
      return all[key];
    },
    async markUsed(reference: ItemReference) {
      const all = await getAll();
      const key = serializeItemReference(reference);
      all[key] = { pinned: all[key]?.pinned ?? false, lastUsedAt: Date.now() };
      await save(all);
      return all[key];
    },
    async prune(references: ItemReference[]) {
      const all = await getAll();
      const known = new Set(references.map(serializeItemReference));
      await save(Object.fromEntries(Object.entries(all).filter(([key]) => known.has(key))));
    },
    async remove(reference: ItemReference) {
      const all = await getAll();
      delete all[serializeItemReference(reference)];
      await save(all);
    },
  };
}
