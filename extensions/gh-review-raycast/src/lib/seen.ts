/**
 * Tracks the last activity timestamp you've already looked at, per PR, so
 * fresh interactions can be flagged as new. This is the Raycast equivalent of
 * the `pr_seen` table in flex-review's SQLite cache.
 */
import { LocalStorage } from "@raycast/api";

import type { PullRequest } from "./types";

const SEEN_KEY = "gh-review.seen";

/** Bounds how long seen-markers live, so the map doesn't grow forever. */
const RETENTION_DAYS = 120;

export type SeenMap = Record<string, string>;

/** The stable identity of a PR: "owner/repo#number". */
export function prKey(pr: Pick<PullRequest, "repository" | "number">): string {
  return `${pr.repository}#${pr.number}`;
}

export async function loadSeen(): Promise<SeenMap> {
  const raw = await LocalStorage.getItem<string>(SEEN_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as SeenMap;
  } catch {
    return {};
  }
}

async function saveSeen(seen: SeenMap): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const pruned: SeenMap = {};
  for (const [key, at] of Object.entries(seen)) {
    if (at >= cutoff) pruned[key] = at;
  }
  await LocalStorage.setItem(SEEN_KEY, JSON.stringify(pruned));
}

/** Records that a PR has been looked at, up to its current activity time. */
export async function markSeen(pr: PullRequest): Promise<void> {
  const seen = await loadSeen();
  seen[prKey(pr)] = pr.lastActivity;
  await saveSeen(seen);
}

/** Marks every PR in a list as seen in one write. */
export async function markAllSeen(prs: PullRequest[]): Promise<void> {
  if (prs.length === 0) return;
  const seen = await loadSeen();
  for (const pr of prs) {
    seen[prKey(pr)] = pr.lastActivity;
  }
  await saveSeen(seen);
}

/** Forgets every seen-marker, so nothing is flagged as new until you look again. */
export async function clearSeen(): Promise<void> {
  await LocalStorage.removeItem(SEEN_KEY);
}

/**
 * Stamps `newSince` on each PR: true when there's activity newer than the last
 * time it was looked at. PRs never seen before are *not* flagged, so a first
 * run doesn't light up everything.
 */
export function markNewSince(prs: PullRequest[], seen: SeenMap): PullRequest[] {
  return prs.map((pr) => {
    const last = seen[prKey(pr)];
    return { ...pr, newSince: Boolean(last) && pr.lastActivity > last };
  });
}
