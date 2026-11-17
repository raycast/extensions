import { LocalStorage } from "@raycast/api";
import type { LiveThread } from "./amp";

const SEEN = "activity-seen";
const WORKING = "activity-working";

export type Seen = Record<string, string>;

export async function loadSeen(): Promise<Seen> {
  return JSON.parse((await LocalStorage.getItem<string>(SEEN)) ?? "{}");
}

export async function markSeen(ids: string[]) {
  const seen = await loadSeen();
  for (const id of ids) seen[id] = new Date().toISOString();
  await LocalStorage.setItem(SEEN, JSON.stringify(seen));
}

/** Threads that stopped working in the last day and changed since you last opened them here. */
export function readyThreads(threads: LiveThread[], seen: Seen): LiveThread[] {
  const dayAgo = Date.now() - 24 * 3600_000;
  return threads
    .filter((t) => !t.working && new Date(t.updatedAt).getTime() > dayAgo)
    .filter((t) => !seen[t.id] || seen[t.id] < t.updatedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Saves the current working set and returns the threads that were working last time and are ready now. */
export async function swapWorkingSet(working: LiveThread[], ready: LiveThread[]): Promise<LiveThread[]> {
  const was: string[] = JSON.parse((await LocalStorage.getItem<string>(WORKING)) ?? "[]");
  await LocalStorage.setItem(WORKING, JSON.stringify(working.map((t) => t.id)));
  return ready.filter((t) => was.includes(t.id));
}
