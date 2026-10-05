import { LocalStorage } from "@raycast/api";

import type { WebsiteSnapshot } from "../types";

const HISTORY_STORAGE_KEY = "website-history";
const MAX_SNAPSHOTS = 100;

export async function loadHistory(): Promise<WebsiteSnapshot[]> {
  const rawValue = await LocalStorage.getItem<string>(HISTORY_STORAGE_KEY);

  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isWebsiteSnapshot);
  } catch {
    return [];
  }
}

export async function saveSnapshot(snapshot: WebsiteSnapshot): Promise<void> {
  const existing = await loadHistory();
  const retained = [snapshot, ...existing.filter((item) => item.domain !== snapshot.domain)].slice(0, MAX_SNAPSHOTS);

  await writeHistory(retained);
}

export async function deleteSnapshot(domain: string): Promise<WebsiteSnapshot[]> {
  const snapshots = await loadHistory();
  const nextSnapshots = snapshots.filter((snapshot) => snapshot.domain !== domain);
  await writeHistory(nextSnapshots);
  return nextSnapshots;
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_STORAGE_KEY);
}

async function writeHistory(snapshots: WebsiteSnapshot[]): Promise<void> {
  await LocalStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(snapshots));
}

function isWebsiteSnapshot(value: unknown): value is WebsiteSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<WebsiteSnapshot>;

  return (
    typeof candidate.domain === "string" &&
    typeof candidate.fetchedAt === "string" &&
    (candidate.source === "argument" || candidate.source === "active-tab") &&
    typeof candidate.data === "object" &&
    candidate.data !== null &&
    !Array.isArray(candidate.data)
  );
}
