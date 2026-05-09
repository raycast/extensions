// Menu Command Bar v01

import { LocalStorage } from "@raycast/api";
import type { MruEntry } from "./types";

const MAX_MRU = 50;

function key(bundleId: string): string {
  return `mru:${bundleId}`;
}

function pathsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export async function readMru(bundleId: string): Promise<MruEntry[]> {
  const raw = await LocalStorage.getItem<string>(key(bundleId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as MruEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function recordUse(
  bundleId: string,
  itemPath: string[],
): Promise<void> {
  const existing = await readMru(bundleId);
  const filtered = existing.filter((e) => !pathsEqual(e.path, itemPath));
  const next: MruEntry[] = [
    { path: itemPath, ts: Date.now() },
    ...filtered,
  ].slice(0, MAX_MRU);
  await LocalStorage.setItem(key(bundleId), JSON.stringify(next));
}

export async function clearMru(bundleId: string): Promise<void> {
  await LocalStorage.removeItem(key(bundleId));
}
