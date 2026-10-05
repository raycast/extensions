import { loadSyncData } from "./lib/data";

/**
 * List TickTick tags.
 */
export default async function tool() {
  const sync = await loadSyncData();
  return {
    tags: sync.tags.map((t) => ({
      name: t.name,
      label: t.label,
      color: t.color,
    })),
    count: sync.tags.length,
  };
}
