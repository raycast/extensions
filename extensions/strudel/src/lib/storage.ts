import { LocalStorage } from "@raycast/api";

const KEY = "strudel.patterns.v1";

export type SavedPattern = {
  id: string;
  name: string;
  code: string;
  createdAt: number;
};

export async function listPatterns(): Promise<SavedPattern[]> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SavedPattern[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function savePattern(name: string, code: string): Promise<SavedPattern> {
  const items = await listPatterns();
  const pattern: SavedPattern = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    code,
    createdAt: Date.now(),
  };
  items.unshift(pattern);
  await LocalStorage.setItem(KEY, JSON.stringify(items));
  return pattern;
}

export async function deletePattern(id: string): Promise<void> {
  const items = await listPatterns();
  const next = items.filter((p) => p.id !== id);
  await LocalStorage.setItem(KEY, JSON.stringify(next));
}

export async function updatePattern(id: string, patch: Partial<Pick<SavedPattern, "name" | "code">>): Promise<void> {
  const items = await listPatterns();
  const next = items.map((p) => (p.id === id ? { ...p, ...patch } : p));
  await LocalStorage.setItem(KEY, JSON.stringify(next));
}

const LAST_PLAYED_KEY = "strudel.lastPlayed.v1";

export async function setLastPlayed(id: string): Promise<void> {
  await LocalStorage.setItem(LAST_PLAYED_KEY, id);
}

export async function getLastPlayed(): Promise<string | null> {
  return (await LocalStorage.getItem<string>(LAST_PLAYED_KEY)) ?? null;
}
