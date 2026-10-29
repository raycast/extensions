import { LocalStorage } from "@raycast/api";
import { accountCacheKey } from "./client";
import type { ToolSummary } from "./types";

export interface SavedTool {
  id: string;
  title: string;
  tool: ToolSummary;
  args?: Record<string, unknown>;
}

export function savedToolsKey(): string {
  return `saved-tools:${accountCacheKey()}`;
}

export async function loadSavedTools(key = savedToolsKey()): Promise<SavedTool[]> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return [];
  const rows: unknown = JSON.parse(raw);
  if (!Array.isArray(rows)) throw new Error("Saved tools could not be read.");
  return rows as SavedTool[];
}

export async function saveTool(item: SavedTool): Promise<void> {
  const key = savedToolsKey();
  const current = await loadSavedTools(key);
  await LocalStorage.setItem(key, JSON.stringify([...current.filter((row) => row.id !== item.id), item]));
}

export async function removeSavedTool(id: string): Promise<void> {
  const key = savedToolsKey();
  await LocalStorage.setItem(key, JSON.stringify((await loadSavedTools(key)).filter((row) => row.id !== id)));
}
