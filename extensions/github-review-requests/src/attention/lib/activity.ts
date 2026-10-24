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
/**
 * Fingerprints are stored one per key, under this prefix, with the day they
 * were written as part of the key: `<prefix><YYYY-MM-DD>.<pull request>`.
 *
 * Two checks run as separate processes, so a key one of them may delete must
 * never be a key the other may write. A run only ever writes today's key, and
 * eviction only ever deletes keys from before the retention cutoff — a month
 * back — so the two can't collide. Re-reading a key before deleting it would
 * not give that: the other check can always refresh it in between.
 */
const FINGERPRINT_PREFIX = "gh-review.watch-fingerprint.";
/** Where fingerprints lived when the key carried no date. Carried over once. */
const SIGNATURE_PREFIX = "gh-review.watch-signature.";
/** Where the baseline lived when it was one map. Carried over on first read. */
const SIGNATURES_KEY = "gh-review.watch-signatures";
/**
 * Set once a baseline exists. Without it an empty set of fingerprints can't be
 * told from never having run, and the first run must stay silent rather than
 * announce every pull request already sitting there.
 */
const BASELINE_KEY = "gh-review.watch-baseline";
const LAST_RUN_KEY = "gh-review.watch-last-run";

/** How long inbox entries are kept, and how many at most. Matches the TUI. */
const RETENTION_HOURS = 72;
const MAX_ENTRIES = 500;
/**
 * How long an entry is safe from the cap after being written. Any run still
 * working is well inside this, so the cap only ever trims entries whose
 * recording run has long since finished.
 */
const RECENTLY_RECORDED_MINUTES = 10;
/** How long a fingerprint outlives the last run that saw its pull request. */
const SIGNATURE_RETENTION_DAYS = 30;
/**
 * How stale a fingerprint's last-seen date may get before a run rewrites it.
 * Unchanged pull requests cost no writes in between, and the margin below the
 * retention window is wide enough that one never expires while still in scope.
 */
const SEEN_REFRESH_DAYS = 7;

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
  /**
   * When this extension wrote the entry, as opposed to when the activity
   * happened. The cap leaves recently written entries alone whoever wrote
   * them, so a check running alongside another can't delete what the other
   * has just recorded and is about to report. Absent on older entries.
   */
  recordedAt?: string;
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

/** The oldest activity time the inbox still keeps. */
function retentionCutoff(): string {
  return new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000).toISOString();
}

/** Reports whether an entry was written too recently for the cap to touch. */
function recentlyRecorded(event: ActivityEvent): boolean {
  if (!event.recordedAt) return false;
  return Date.now() - Date.parse(event.recordedAt) < RECENTLY_RECORDED_MINUTES * 60 * 1000;
}

/**
 * Drops entries older than the retention window and caps the total, newest
 * first. An entry written in the last few minutes is never dropped by the cap:
 * a check running alongside this one may have just recorded it and be about to
 * report it, and this run's view of storage is a snapshot taken before that.
 * Whether an entry may go is decided entirely by the entry itself, never by
 * which other entries this run happened to see.
 */
function prune(events: ActivityEvent[]): ActivityEvent[] {
  const cutoff = retentionCutoff();
  const ordered = events.filter(e => e.at >= cutoff).sort((a, b) => b.at.localeCompare(a.at));
  if (ordered.length <= MAX_ENTRIES) return ordered;

  let overflow = ordered.length - MAX_ENTRIES;
  const dropped = new Set<string>();
  for (let i = ordered.length - 1; i >= 0 && overflow > 0; i--) {
    if (recentlyRecorded(ordered[i])) continue;
    dropped.add(ordered[i].id);
    overflow--;
  }
  return ordered.filter(e => !dropped.has(e.id));
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
 * entries that were genuinely new — and that the inbox actually kept: the
 * watcher advances its baseline on the strength of this, so an entry reported
 * here and swept up in the same call would be lost for good.
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
  // Activity the window has already passed is never written, so it is never
  // reported either. A comment count can move a pull request's signature while
  // its last activity stays days old, and that entry has no place in a
  // 72-hour inbox — but the run must not claim to have recorded it.
  const cutoff = retentionCutoff();
  const recordedAt = new Date().toISOString();
  const fresh = events.filter(e => !seen.has(e.id) && e.at >= cutoff).map(e => ({ ...e, recordedAt }));
  if (fresh.length === 0) return [];
  await Promise.all(fresh.map(e => LocalStorage.setItem(keyFor(e.id), JSON.stringify(e))));
  // `recordedAt` is what keeps these out of the cap's reach, here and in any
  // check running alongside this one.
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

/**
 * A fingerprint, and the day a run last saw the pull request it belongs to —
 * `YYYY-MM-DD`, read back off the key it was stored under. Baselines written
 * by earlier versions carry a full timestamp here instead, and are reduced to
 * a day as they are carried over.
 */
type SignatureEntry = { sig: string; seen: string };
type SignatureMap = Record<string, SignatureEntry>;

/** The day part of a key, as `YYYY-MM-DD`. */
function dayStamp(at: number): string {
  return new Date(at).toISOString().slice(0, 10);
}

function fingerprintKey(day: string, prKey: string): string {
  return `${FINGERPRINT_PREFIX}${day}.${prKey}`;
}

/** Splits a stored key back into the day it was written and what it describes. */
function readFingerprintKey(key: string): { day: string; prKey: string } | undefined {
  const rest = key.slice(FINGERPRINT_PREFIX.length);
  // `YYYY-MM-DD.`, then the pull request, which may itself contain dots.
  if (!/^\d{4}-\d{2}-\d{2}\./.test(rest)) return undefined;
  return { day: rest.slice(0, 10), prKey: rest.slice(11) };
}

/**
 * Moves a baseline written in either earlier shape — one map, or a key per
 * fingerprint without the date — across to dated keys, once. Each value keeps
 * the date it carried, so nothing is granted a fresh month; only the oldest
 * shape, which recorded none, is dated today. Upgrading never reads as a fresh
 * install, and a pull request still in scope is rewritten under today's key by
 * the commit that follows before anything sweeps the old one.
 */
async function adoptLegacySignatures(): Promise<void> {
  const today = dayStamp(Date.now());
  /** `[day, pull request, fingerprint]`, ready to be written under a dated key. */
  const carried: [string, string, string][] = [];
  /** Keeps a value's own date where it had one, so nothing gains a month. */
  const dayOf = (entry: SignatureEntry | string) =>
    typeof entry === "string" || !entry.seen ? today : dayStamp(Date.parse(entry.seen));

  const raw = await LocalStorage.getItem<string>(SIGNATURES_KEY);
  if (raw) {
    try {
      const stored = JSON.parse(raw) as Record<string, SignatureEntry | string>;
      for (const [prKey, value] of Object.entries(stored)) {
        carried.push([dayOf(value), prKey, typeof value === "string" ? value : value.sig]);
      }
    } catch {
      // Unreadable: nothing to carry over, and the key still goes.
    }
  }

  const items = await LocalStorage.allItems();
  const undated = Object.entries(items).filter(([key]) => key.startsWith(SIGNATURE_PREFIX));
  for (const [key, value] of undated) {
    if (typeof value !== "string") continue;
    try {
      const entry = JSON.parse(value) as SignatureEntry;
      carried.push([dayOf(entry), key.slice(SIGNATURE_PREFIX.length), entry.sig]);
    } catch {
      // A half-written fingerprint only costs one re-detection.
    }
  }

  if (!raw && undated.length === 0) return;

  await Promise.all(carried.map(([day, prKey, sig]) => LocalStorage.setItem(fingerprintKey(day, prKey), sig)));
  // Whatever was there was a baseline, even if it held nothing.
  await LocalStorage.setItem(BASELINE_KEY, new Date().toISOString());
  await Promise.all(undated.map(([key]) => LocalStorage.removeItem(key)));
  await LocalStorage.removeItem(SIGNATURES_KEY);
}

/** The stored baseline, or undefined when no run has established one yet. */
async function loadSignatures(): Promise<SignatureMap | undefined> {
  await adoptLegacySignatures();
  if (!(await LocalStorage.getItem<string>(BASELINE_KEY))) return undefined;

  const items = await LocalStorage.allItems();
  const map: SignatureMap = {};
  for (const [key, value] of Object.entries(items)) {
    if (!key.startsWith(FINGERPRINT_PREFIX) || typeof value !== "string") continue;
    const parsed = readFingerprintKey(key);
    if (!parsed) continue;
    // A pull request keeps one key per day it was written on, so the newest
    // day is the fingerprint that counts and the others are on their way out.
    const held = map[parsed.prKey];
    if (!held || held.seen < parsed.day) map[parsed.prKey] = { sig: value, seen: parsed.day };
  }
  return map;
}

/**
 * Forgets fingerprints written more than a month ago.
 *
 * Nothing is read to decide this: the day is in the key, and a run only ever
 * writes today's. A check refreshing a fingerprint this one considers stale
 * therefore writes a key this deletion cannot name, and the refreshed value
 * survives. Reading a key and then deleting it would not hold — the refresh
 * can always land in between.
 */
async function evictSignatures(): Promise<void> {
  const cutoff = dayStamp(Date.now() - SIGNATURE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const items = await LocalStorage.allItems();
  const stale = Object.keys(items).filter(key => {
    if (!key.startsWith(FINGERPRINT_PREFIX)) return false;
    const parsed = readFingerprintKey(key);
    return parsed !== undefined && parsed.day < cutoff;
  });
  await Promise.all(stale.map(key => LocalStorage.removeItem(key)));
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
 *
 * Committing writes one key per fingerprint rather than a map, because the
 * scheduled watcher and a check you start yourself run as separate processes
 * over different candidates: a shared map means one of them saving over what
 * the other just recorded.
 */
export async function diffCandidates(
  candidates: Candidate[],
): Promise<{ changes: Change[]; commit: () => Promise<void> }> {
  const previous = await loadSignatures();

  const today = dayStamp(Date.now());
  const current: SignatureMap = {};
  for (const { kind, pr } of candidates) {
    current[`${kind}:${pr.repository}#${pr.number}`] = { sig: signature(pr), seen: today };
  }

  const refreshBefore = dayStamp(Date.now() - SEEN_REFRESH_DAYS * 24 * 60 * 60 * 1000);
  const commit = async () => {
    // Only the fingerprints that actually need writing: a run that finds
    // nothing changed writes nothing, and one this run never saw is left
    // exactly as another run left it.
    const changed = Object.entries(current).filter(([key, entry]) => {
      const before = previous?.[key];
      return !before || before.sig !== entry.sig || before.seen < refreshBefore;
    });
    // Under today's key, always: it is the one key eviction can never name,
    // so a fingerprint refreshed here outlives another check's sweep.
    await Promise.all(changed.map(([key, entry]) => LocalStorage.setItem(fingerprintKey(today, key), entry.sig)));
    await LocalStorage.setItem(BASELINE_KEY, new Date().toISOString());
    await evictSignatures();
  };

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
    } else if (before.sig !== signature(candidate.pr)) {
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
  const items = await LocalStorage.allItems();
  const keys = Object.keys(items).filter(key => key.startsWith(FINGERPRINT_PREFIX) || key.startsWith(SIGNATURE_PREFIX));
  await Promise.all(keys.map(key => LocalStorage.removeItem(key)));
  await LocalStorage.removeItem(SIGNATURES_KEY);
  await LocalStorage.removeItem(BASELINE_KEY);
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
