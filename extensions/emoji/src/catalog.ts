import { readFile } from "node:fs/promises";
import path from "node:path";
import labels from "./generated/labels.json";
import { SearchableEmoji } from "./search";

export type UnicodeVersion = "4.0" | "5.0" | "11.0" | "12.0" | "12.1" | "13.0" | "13.1" | "14.0" | "15.0" | "15.1";
const recentLabels: Record<string, { description: string; category: string }> = labels;

export async function loadCatalog(assetsPath: string, version: UnicodeVersion): Promise<SearchableEmoji[]> {
  const content = await readFile(path.join(assetsPath, "catalogs", version + ".json"), "utf8");
  return JSON.parse(content) as SearchableEmoji[];
}

export function resolveRecents(ids: string[], catalog: SearchableEmoji[] = []): SearchableEmoji[] {
  const byEmoji = new Map(catalog.map((item) => [item.emoji, item]));
  return ids.map(
    (emoji) =>
      byEmoji.get(emoji) ?? { emoji, ...recentLabels[emoji], description: recentLabels[emoji]?.description ?? emoji },
  );
}
