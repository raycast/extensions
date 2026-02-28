import fetch from "node-fetch";

import { Cache } from "@raycast/api";

import { MDN_BASE_URL } from "@/lib/mdn";
import type { MdnSearchIndexItem } from "@/types";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const cache = new Cache({ namespace: "mdn-search-index" });

type CachedSearchIndex = {
  fetchedAt: number;
  items: MdnSearchIndexItem[];
};

function readCachedIndex(locale: string): CachedSearchIndex | undefined {
  const raw = cache.get(locale);
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as CachedSearchIndex;
  } catch {
    cache.remove(locale);
    return undefined;
  }
}

function normalizeItems(payload: unknown): MdnSearchIndexItem[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  const items: MdnSearchIndexItem[] = [];

  for (const raw of payload) {
    if (!raw || typeof raw !== "object") {
      continue;
    }

    const title = "title" in raw && typeof raw.title === "string" ? raw.title.trim() : "";
    const url = "url" in raw && typeof raw.url === "string" ? raw.url.trim() : "";

    if (!title || !url) {
      continue;
    }

    items.push({
      title,
      url: url.startsWith("/") ? url : `/${url}`,
    });
  }

  return items;
}

export async function fetchSearchIndex(locale: string): Promise<MdnSearchIndexItem[]> {
  const cached = readCachedIndex(locale);

  if (cached && Date.now() - cached.fetchedAt < ONE_DAY_MS) {
    return cached.items;
  }

  const indexUrl = `${MDN_BASE_URL}/${locale}/search-index.json`;

  try {
    const response = await fetch(indexUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as unknown;
    const items = normalizeItems(payload);

    cache.set(
      locale,
      JSON.stringify({
        fetchedAt: Date.now(),
        items,
      } satisfies CachedSearchIndex),
    );

    return items;
  } catch (error) {
    if (cached) {
      return cached.items;
    }

    throw error;
  }
}
