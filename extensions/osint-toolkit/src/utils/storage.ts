/**
 * Local storage utilities for OSINT Toolkit
 */

import { LocalStorage } from "@raycast/api";
import { IOCType } from "../types";

export interface StoredIOC {
  value: string;
  type: IOCType;
  lastUsed: number;
  starred: boolean;
}

const RECENTS_KEY = "recent_iocs";
const MAX_RECENTS = 20;

export async function getStoredIOCs(): Promise<StoredIOC[]> {
  const raw = await LocalStorage.getItem<string>(RECENTS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as StoredIOC[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
}

export async function saveStoredIOCs(items: StoredIOC[]): Promise<void> {
  await LocalStorage.setItem(RECENTS_KEY, JSON.stringify(items));
}

export async function addRecentIOC(
  value: string,
  type: IOCType,
): Promise<void> {
  const now = Date.now();
  const current = await getStoredIOCs();

  const normalizedValue = value.trim();
  const existingIndex = current.findIndex(
    (item) => item.value === normalizedValue && item.type === type,
  );

  if (existingIndex >= 0) {
    current[existingIndex].lastUsed = now;
  } else {
    current.unshift({
      value: normalizedValue,
      type,
      lastUsed: now,
      starred: false,
    });
  }

  const sorted = current
    .sort((a, b) => b.lastUsed - a.lastUsed)
    .slice(0, MAX_RECENTS);

  await saveStoredIOCs(sorted);
}

export async function toggleStarIOC(
  value: string,
  type: IOCType,
): Promise<void> {
  const current = await getStoredIOCs();
  const normalizedValue = value.trim();

  const index = current.findIndex(
    (item) => item.value === normalizedValue && item.type === type,
  );

  if (index === -1) {
    const now = Date.now();
    current.unshift({
      value: normalizedValue,
      type,
      lastUsed: now,
      starred: true,
    });
  } else {
    current[index].starred = !current[index].starred;
  }

  await saveStoredIOCs(current);
}

export async function removeIOC(value: string, type: IOCType): Promise<void> {
  const current = await getStoredIOCs();
  const normalizedValue = value.trim();
  const filtered = current.filter(
    (item) => !(item.value === normalizedValue && item.type === type),
  );
  await saveStoredIOCs(filtered);
}

export async function clearHistory(): Promise<void> {
  await saveStoredIOCs([]);
}
