import { LocalStorage } from "@raycast/api";
import { AgentId, parseAgentId } from "./types";

const FAVORITE_BOT_IDS_KEY = "favorite-bot-ids";

export function parseFavoriteIds(raw: unknown): AgentId[] {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<AgentId>();
  const result: AgentId[] = [];
  for (const entry of value) {
    const parsed = parseAgentId(entry);
    if (!parsed.ok || seen.has(parsed.value)) {
      continue;
    }
    seen.add(parsed.value);
    result.push(parsed.value);
  }
  return result;
}

export function toggleFavoriteId(ids: readonly AgentId[], id: AgentId): AgentId[] {
  if (ids.includes(id)) {
    return ids.filter((entry) => entry !== id);
  }
  return [...ids, id];
}

export async function getFavoriteIds(): Promise<AgentId[]> {
  const stored = await LocalStorage.getItem<string>(FAVORITE_BOT_IDS_KEY);
  return stored === undefined ? [] : parseFavoriteIds(stored);
}

export async function setFavoriteIds(ids: readonly AgentId[]): Promise<void> {
  await LocalStorage.setItem(FAVORITE_BOT_IDS_KEY, JSON.stringify(ids));
}
