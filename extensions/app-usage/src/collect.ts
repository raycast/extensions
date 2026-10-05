import { environment, getFrontmostApplication, getPreferenceValues, LaunchType, showHUD } from "@raycast/api";
import { getIdleSeconds } from "./core/idle";
import { tick } from "./core/sampler";
import { createStore, localDateKey } from "./core/store";
import type { AppRef } from "./core/types";

/** Must match the `interval` declared for this command in package.json. */
const INTERVAL_MS = 60_000;
/** Beyond this an interval is a gap (sleep, Raycast restart), not real usage. */
const MAX_GAP_MS = INTERVAL_MS * 2;
/** Matches the longest range the report can show. Keeping more would store
 * data no view can reach. */
const DEFAULT_RETENTION_DAYS = 30;

function parseExcluded(raw?: string): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isExcluded(excluded: Set<string>, name: string, key?: string): boolean {
  return excluded.has(name.toLowerCase()) || (key !== undefined && excluded.has(key.toLowerCase()));
}

function parseRetentionDays(raw?: string): number {
  const parsed = Number.parseInt((raw ?? "").trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RETENTION_DAYS;
}

export default async function collect(): Promise<void> {
  // Raycast lists every command in root search, including this one. A manual run
  // would write a timestamp out of sequence and corrupt the next interval, so
  // explain and bail instead.
  if (environment.launchType !== LaunchType.Background) {
    await showHUD("App Usage records automatically in the background");
    return;
  }

  const preferences = getPreferenceValues<Preferences>();
  const excluded = parseExcluded(preferences.excludedApps);
  const store = createStore(environment.supportPath);

  const now = Date.now();
  const [frontmost, idleSeconds, state] = await Promise.all([
    getFrontmostApplication().catch(() => null),
    getIdleSeconds(),
    store.readState(),
  ]);

  let current: AppRef | null = null;
  if (frontmost) {
    const name = frontmost.name;
    const bundleId = frontmost.bundleId;

    // Excluded apps are dropped here, before anything reaches disk. Not even the
    // state file learns their name.
    if (!isExcluded(excluded, name, bundleId)) {
      current = { key: bundleId ?? name, name };
    }
  }

  // The saved app passed the exclusion list as it stood last tick. If the user has
  // since excluded it, the window it opened must not be recorded either.
  const previous =
    state && state.lastKey !== "" && isExcluded(excluded, state.lastName, state.lastKey)
      ? { ...state, lastKey: "", lastName: "" }
      : state;

  const { slice, nextState } = tick(now, current, idleSeconds, previous, { maxGapMs: MAX_GAP_MS });

  if (slice) {
    await store.record(slice);
  }
  await store.writeState(nextState);

  // Prune once a day, on the first tick after the local date rolls over.
  if (state && localDateKey(state.lastAt) !== localDateKey(now)) {
    await store.prune(parseRetentionDays(preferences.retentionDays), now);
  }
}
