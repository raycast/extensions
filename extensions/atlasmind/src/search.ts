import Fuse, { IFuseOptions } from "fuse.js";
import type { Item } from "./types";

interface IndexedItem extends Item {
  host: string;
}

const FUSE_OPTIONS: IFuseOptions<IndexedItem> = {
  includeScore: true,
  threshold: 0.4,
  ignoreLocation: true,
  minMatchCharLength: 2,
  keys: [
    { name: "title", weight: 3.0 },
    { name: "og_title", weight: 2.5 },
    { name: "tags", weight: 2.0 },
    { name: "host", weight: 1.5 },
    { name: "og_description", weight: 1.5 },
    { name: "content", weight: 1.0 },
    { name: "body_excerpt", weight: 0.8 },
  ],
};

const hostCache = new Map<string, string>();

function hostFor(item: Item): string {
  if (item.type !== "url") return "";
  const cached = hostCache.get(item.id);
  if (cached !== undefined) return cached;
  let host = "";
  try {
    host = new URL(item.content).hostname.replace(/^www\./, "");
  } catch {
    host = "";
  }
  hostCache.set(item.id, host);
  return host;
}

function recencyBoost(createdAt: string): number {
  const ageDays = (Date.now() - Date.parse(createdAt)) / 86_400_000;
  if (!Number.isFinite(ageDays) || ageDays < 0) return 0;
  return 0.1 * Math.exp(-ageDays / 60);
}

export function rankItems(items: Item[], query: string): Item[] {
  if (!query.trim()) return items;

  const indexed: IndexedItem[] = items.map((i) => ({ ...i, host: hostFor(i) }));
  const fuse = new Fuse(indexed, FUSE_OPTIONS);
  const results = fuse.search(query);

  return results
    .map((r) => ({
      item: r.item as Item,
      score: 1 - (r.score ?? 1) + recencyBoost(r.item.created_at),
    }))
    .sort((a, b) => b.score - a.score)
    .map((r) => r.item);
}
