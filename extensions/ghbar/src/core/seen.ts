import { Item } from "./models";

/**
 * TWO SEPARATE SETS, deliberately:
 *
 *   seen      — drives the green/faded tint, flips when the user clicks
 *   notified  — "already announced once, never again"
 *
 * Conflating them re-announces the same old items on every refresh, because
 * nothing becomes `seen` until the user clicks it.
 *
 * v1 sends no notifications (Raycast has no system-notification API), but
 * `notified` is still maintained so that adding them later cannot produce
 * a flood on the first run.
 */
export interface SeenState {
  version: number;
  bootstrapped: boolean;
  /** url -> ISO 8601 */
  seen: Record<string, string>;
  notified: string[];
}

export const SEEN_STATE_VERSION = 2;

export function emptySeenState(): SeenState {
  return { version: SEEN_STATE_VERSION, bootstrapped: false, seen: {}, notified: [] };
}

export interface DecodedSeenState {
  state: SeenState;
  /**
   * Upgrading from a v1 record, which had no `notified` field. Without a
   * one-time backfill the first refresh after the upgrade would treat every
   * existing item as never-announced.
   */
  needsNotificationBackfill: boolean;
}

/** Corrupt data resets silently; refusing to open the command would be worse. */
export function decodeSeenState(raw: string | undefined): DecodedSeenState {
  if (raw === undefined || raw.length === 0) {
    return { state: emptySeenState(), needsNotificationBackfill: false };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { state: emptySeenState(), needsNotificationBackfill: false };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { state: emptySeenState(), needsNotificationBackfill: false };
  }

  const object = parsed as Record<string, unknown>;
  const bootstrapped = object.bootstrapped === true;

  const seen: Record<string, string> = {};
  const rawSeen = object.seen;
  if (typeof rawSeen === "object" && rawSeen !== null && !Array.isArray(rawSeen)) {
    for (const [url, at] of Object.entries(rawSeen as Record<string, unknown>)) {
      if (typeof at === "string") seen[url] = at;
    }
  }

  const hasNotifiedField = Array.isArray(object.notified);
  const notified = hasNotifiedField
    ? (object.notified as unknown[]).filter((v): v is string => typeof v === "string")
    : [];

  return {
    state: {
      version: typeof object.version === "number" ? object.version : 1,
      bootstrapped,
      seen,
      notified,
    },
    // Hatanin yasandigi gercek durum: bootstrapped=true, notified alani hic yok.
    needsNotificationBackfill: bootstrapped && !hasNotifiedField,
  };
}

export function encodeSeenState(state: SeenState): string {
  return JSON.stringify({ ...state, version: SEEN_STATE_VERSION });
}

export function isSeen(state: SeenState, url: string): boolean {
  return state.seen[url] !== undefined;
}

export function markSeen(state: SeenState, urls: string[], at: Date): SeenState {
  const seen = { ...state.seen };
  const stamp = at.toISOString();
  for (const url of urls) seen[url] = stamp;
  return { ...state, seen };
}

export function newItems(state: SeenState, items: Item[]): Item[] {
  return items.filter((item) => !isSeen(state, item.url));
}

export function unseenCount(state: SeenState, items: Item[]): number {
  return newItems(state, items).length;
}

/** Items never announced before. */
export function unnotified(state: SeenState, items: Item[]): Item[] {
  const notified = new Set(state.notified);
  return items.filter((item) => !notified.has(item.url));
}

export function markNotified(state: SeenState, urls: string[]): SeenState {
  const notified = new Set(state.notified);
  for (const url of urls) notified.add(url);
  return { ...state, notified: [...notified] };
}

export function isFirstRun(state: SeenState): boolean {
  return !state.bootstrapped;
}

/**
 * Marks the first run; the second value reports whether this call changed it.
 *
 * This exists ONLY to silence notifications. It does NOT mark items seen:
 * doing that made everything start faded with a zero badge, leaving "Mark All
 * as Seen" with nothing to do.
 */
export function markFirstRunDone(state: SeenState): [SeenState, boolean] {
  if (state.bootstrapped) return [state, false];
  return [{ ...state, bootstrapped: true }, true];
}

/** Drops closed/merged items, otherwise the record grows without bound. */
export function prune(state: SeenState, live: Set<string>): SeenState {
  const seen: Record<string, string> = {};
  for (const [url, at] of Object.entries(state.seen)) {
    if (live.has(url)) seen[url] = at;
  }
  // Dropping a URL means a reopened item can be announced again.
  return { ...state, seen, notified: state.notified.filter((url) => live.has(url)) };
}

/**
 * Menu-bar commands run as short-lived processes and two of them can write
 * here at once: a background refresh may already be in flight when the user
 * hits "Mark All as Seen". That refresh read the OLD state and would write it
 * back when its network round-trip finishes, erasing the fresh marks — the
 * lost update Raycast's docs warn about for background commands.
 *
 * Merging is safe because seen-ness is monotonic: an item never becomes
 * unseen. When a URL appears on both sides the EARLIER timestamp wins, since
 * the question being answered is "when did we first see this".
 */
export function mergeSeenState(base: SeenState, incoming: SeenState): SeenState {
  const seen: Record<string, string> = { ...base.seen };
  for (const [url, at] of Object.entries(incoming.seen)) {
    const existing = seen[url];
    seen[url] = existing === undefined || at < existing ? at : existing;
  }

  const notified = new Set(base.notified);
  for (const url of incoming.notified) notified.add(url);

  return {
    version: SEEN_STATE_VERSION,
    // If either side bootstrapped, stay bootstrapped — undoing it would flood.
    bootstrapped: base.bootstrapped || incoming.bootstrapped,
    seen,
    notified: [...notified],
  };
}
