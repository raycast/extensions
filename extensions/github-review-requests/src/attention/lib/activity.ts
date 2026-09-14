/**
 * The Activity Inbox: a rolling record of everything the background watcher
 * noticed, plus the fingerprint tracker that decides what counts as "new".
 *
 * This mirrors two pieces of flex-review: the `notify.Tracker` diff (which PRs
 * changed since the last look) and the web dashboard's received-notification
 * history (a 72-hour rolling window, so nothing is lost if you miss a banner).
 */
import { LocalStorage } from "@raycast/api";

import type { ActivityKind } from "./config";
import { demoActivity, isDemoMode } from "./demo";
import type { PullRequest } from "./types";

/**
 * Entries are stored one per key, under this prefix. The inbox is written by
 * the scheduled watcher and by a check you start yourself, in separate
 * processes: holding them in a single array meant each run replaced the whole
 * inbox with its own snapshot, so an entry recorded by the other run in the
 * meantime was dropped — and, its baseline already advanced, never re-detected.
 * A run now only ever writes the keys of its own entries.
 */
const ACTIVITY_PREFIX = "gh-review.activity.";
/** Where the inbox lived when it was one array. Carried over on first read. */
const ACTIVITY_KEY = "gh-review.activity";
const SIGNATURES_KEY = "gh-review.watch-signatures";
const LAST_RUN_KEY = "gh-review.watch-last-run";

/** How long inbox entries are kept, and how many at most. Matches the TUI. */
const RETENTION_HOURS = 72;
const MAX_ENTRIES = 500;

/** One thing that happened, as recorded by the background watcher. */
export type ActivityEvent = {
  /** Stable identity: kind + PR + fingerprint, so a repeat check can't duplicate it. */
  id: string;
  kind: ActivityKind;
  prKey: string;
  repository: string;
  number: number;
  title: string;
  /** The pull request URL. */
  url: string;
  /**
   * Deep link to the comment that triggered this, when there is one. Opening
   * the entry — or clicking its banner — lands on the message itself.
   * Absent on older entries recorded before this was captured.
   */
  commentUrl?: string;
  /** Who triggered it — the latest replier, or the PR author for a new PR. */
  actor: string;
  /** The human-readable one-liner, e.g. "@alice replied · 2 threads awaiting you". */
  summary: string;
  /** When the underlying GitHub activity happened (ISO 8601). */
  at: string;
  read: boolean;
  /** Whether a banner actually fired, vs. recorded silently. */
  notified: boolean;
};

// ---------------------------------------------------------------------------
// Inbox
// ---------------------------------------------------------------------------

export async function loadActivity(): Promise<ActivityEvent[]> {
  // Screenshot mode: the inbox holds real repository names, so it must be
  // replaced wholesale rather than filtered.
  if (await isDemoMode()) return demoActivity();

  await adoptLegacyEntries();
  return prune(await readEntries());
}

function keyFor(id: string): string {
  return `${ACTIVITY_PREFIX}${id}`;
}

/** Every stored entry, in no particular order. Unreadable ones are skipped. */
async function readEntries(): Promise<ActivityEvent[]> {
  const items = await LocalStorage.allItems();
  const events: ActivityEvent[] = [];
  for (const [key, value] of Object.entries(items)) {
    if (!key.startsWith(ACTIVITY_PREFIX) || typeof value !== "string") continue;
    try {
      events.push(JSON.parse(value) as ActivityEvent);
    } catch {
      // A half-written entry shouldn't take the rest of the inbox with it.
    }
  }
  return events;
}

/**
 * Moves entries written under the old single key across to their own, once.
 * An upgrade shouldn't look like an emptied inbox.
 */
async function adoptLegacyEntries(): Promise<void> {
  const raw = await LocalStorage.getItem<string>(ACTIVITY_KEY);
  if (!raw) return;
  try {
    const events = JSON.parse(raw) as ActivityEvent[];
    await Promise.all(events.map(e => LocalStorage.setItem(keyFor(e.id), JSON.stringify(e))));
  } catch {
    // Unreadable: there is nothing to carry over, and the key still goes.
  }
  await LocalStorage.removeItem(ACTIVITY_KEY);
}

/** Drops entries older than the retention window and caps the total. */
function prune(events: ActivityEvent[]): ActivityEvent[] {
  const cutoff = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000).toISOString();
  const kept = events.filter(e => e.at >= cutoff).sort((a, b) => b.at.localeCompare(a.at));
  return kept.slice(0, MAX_ENTRIES);
}

/**
 * Deletes what falls outside the retention window or over the cap. Only the
 * entries handed in are considered, so an entry another run added while this
 * one was working is left alone rather than swept up as unknown.
 */
async function evict(events: ActivityEvent[]): Promise<void> {
  const kept = new Set(prune(events).map(e => e.id));
  const stale = events.filter(e => !kept.has(e.id));
  await Promise.all(stale.map(e => LocalStorage.removeItem(keyFor(e.id))));
}

/** Rewrites one entry in place, leaving every other key untouched. */
async function updateEntry(id: string, change: (event: ActivityEvent) => ActivityEvent): Promise<void> {
  const raw = await LocalStorage.getItem<string>(keyFor(id));
  if (!raw) return;
  try {
    await LocalStorage.setItem(keyFor(id), JSON.stringify(change(JSON.parse(raw) as ActivityEvent)));
  } catch {
    // Unreadable entries are dropped by the next read; nothing to mark.
  }
}

/**
 * Adds new entries, skipping any whose id is already recorded. Returns the
 * entries that were genuinely new.
 *
 * Each entry goes to its own key, so a check running at the same time can
 * neither lose these nor have its own lost. Two runs that both record the same
 * event write the same bytes to the same key, which is harmless.
 */
export async function recordActivity(events: ActivityEvent[]): Promise<ActivityEvent[]> {
  if (events.length === 0) return [];
  await adoptLegacyEntries();
  const existing = await readEntries();
  const seen = new Set(existing.map(e => e.id));
  const fresh = events.filter(e => !seen.has(e.id));
  if (fresh.length === 0) return [];
  await Promise.all(fresh.map(e => LocalStorage.setItem(keyFor(e.id), JSON.stringify(e))));
  await evict([...existing, ...fresh]);
  return fresh;
}

export async function markActivityRead(ids: string[]): Promise<void> {
  await Promise.all(ids.map(id => updateEntry(id, event => ({ ...event, read: true }))));
}

export async function markAllActivityRead(): Promise<void> {
  const events = await readEntries();
  await Promise.all(events.filter(e => !e.read).map(e => updateEntry(e.id, event => ({ ...event, read: true }))));
}

export async function clearActivity(): Promise<void> {
  const items = await LocalStorage.allItems();
  const keys = Object.keys(items).filter(key => key.startsWith(ACTIVITY_PREFIX));
  await Promise.all(keys.map(key => LocalStorage.removeItem(key)));
  await LocalStorage.removeItem(ACTIVITY_KEY);
}

export function unreadCount(events: ActivityEvent[]): number {
  return events.filter(e => !e.read).length;
}

// ---------------------------------------------------------------------------
// Change tracking
// ---------------------------------------------------------------------------

/**
 * A fingerprint of everything about a PR worth notifying on. When this string
 * changes, something happened.
 */
export function signature(pr: PullRequest): string {
  return [pr.lastActivity, pr.comments, pr.unresolved, pr.awaitingReply, pr.reviewDecision].join("|");
}

type SignatureMap = Record<string, string>;

async function loadSignatures(): Promise<SignatureMap | undefined> {
  const raw = await LocalStorage.getItem<string>(SIGNATURES_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as SignatureMap;
  } catch {
    return undefined;
  }
}

async function saveSignatures(map: SignatureMap): Promise<void> {
  await LocalStorage.setItem(SIGNATURES_KEY, JSON.stringify(map));
}

/** A PR the watcher found, tagged with which category surfaced it. */
export type Candidate = { kind: ActivityKind; pr: PullRequest };

/** A candidate that changed, and whether the watcher had never seen it before. */
export type Change = Candidate & { isNew: boolean };

/**
 * Returns the candidates that are new or whose fingerprint changed since the
 * previous run, together with a `commit` that advances the baseline.
 *
 * **The baseline is deliberately not advanced here.** Writing it before the
 * caller has recorded the changes means a crash, or a failed storage write, in
 * between would mark unrecorded activity as already seen — permanently
 * dropping a review request or an unanswered question from the inbox, with no
 * way to notice. So the caller commits only once the events are safely stored.
 *
 * Re-detecting after an interrupted run is harmless: `recordActivity` is
 * idempotent on the event id, so at worst a banner repeats. Losing a review
 * request silently is much worse than showing one twice.
 *
 * The very first run has no baseline: it reports nothing and only establishes
 * one, so installing the extension never fires a wall of banners about pull
 * requests that were already sitting there.
 */
export async function diffCandidates(
  candidates: Candidate[],
): Promise<{ changes: Change[]; commit: () => Promise<void> }> {
  const previous = await loadSignatures();

  const current: SignatureMap = {};
  for (const { kind, pr } of candidates) {
    current[`${kind}:${pr.repository}#${pr.number}`] = signature(pr);
  }
  const commit = () => saveSignatures(current);

  // Nothing to record on a first run, so the baseline can be taken immediately.
  if (!previous) {
    await commit();
    return { changes: [], commit: async () => {} };
  }

  const changes: Change[] = [];
  for (const candidate of candidates) {
    const key = `${candidate.kind}:${candidate.pr.repository}#${candidate.pr.number}`;
    const before = previous[key];
    if (before === undefined) {
      changes.push({ ...candidate, isNew: true });
    } else if (before !== signature(candidate.pr)) {
      changes.push({ ...candidate, isNew: false });
    }
  }
  return { changes, commit };
}

/** Where an entry should open: the comment if we have one, else the PR. */
export function targetUrl(event: Pick<ActivityEvent, "url" | "commentUrl">): string {
  return event.commentUrl || event.url;
}

/** Forgets the baseline, so the next run starts fresh without notifying. */
export async function resetTracker(): Promise<void> {
  await LocalStorage.removeItem(SIGNATURES_KEY);
}

export async function setLastRun(at: Date): Promise<void> {
  await LocalStorage.setItem(LAST_RUN_KEY, at.toISOString());
}

export async function getLastRun(): Promise<string | undefined> {
  return LocalStorage.getItem<string>(LAST_RUN_KEY);
}

// Quiet-hours arithmetic lives in ./quiet-hours so it stays pure and testable;
// re-exported here because callers think of it as part of the watcher.
export { inQuietHours, quietHoursLabel } from "./quiet-hours";
