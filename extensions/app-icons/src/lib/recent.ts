import { LocalStorage } from "@raycast/api";

const KEY = "recent-searches";
const LIMIT = 6;

export async function loadRecent(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, LIMIT);
  } catch {
    return [];
  }
}

export async function rememberRecent(term: string): Promise<string[]> {
  const cleaned = term.trim().replace(/\s+/g, " ").slice(0, 80);
  if (!cleaned) return loadRecent();
  const current = await loadRecent();
  const next = [cleaned, ...current.filter((item) => item.toLowerCase() !== cleaned.toLowerCase())].slice(0, LIMIT);
  await LocalStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function forgetRecent(term: string): Promise<string[]> {
  const next = (await loadRecent()).filter((item) => item !== term);
  await LocalStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
