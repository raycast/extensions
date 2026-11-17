// Shared by the menu bar command and the details view.
import { Cache, LocalStorage, environment, getPreferenceValues } from "@raycast/api";
import { readSamples, readState, sample } from "./sample.ts";
import type { NetInfo } from "./sample.ts";
import { MIN, WINDOWS, aggregate, counts, countOn, filterSamples, pickedIds, spikes } from "./stats.ts";
import type { Agg, Filter } from "./stats.ts";

export const dir = environment.supportPath;

// LocalStorage is async, so the first paint of a command could not use it. Cache is synchronous and shared by
// both commands: it mirrors the two settings the menu writes, and the async read refreshes it.
const cache = new Cache();

const parsePicked = (raw?: string) => {
  try {
    return new Set<string>(JSON.parse(raw ?? "[]"));
  } catch {
    return new Set<string>();
  }
};

export const readPickedSync = () => parsePicked(cache.get("pickedNets"));
export const readPinnedSync = () => Number(cache.get("pinnedWindow")) || undefined;
// The window the menu bar shows (pinned or Default Window): the details view opens on the same one.
export const readBarWindow = () => Number(cache.get("barWindow")) || undefined;
export const rememberBarWindow = (win: number) => {
  if (readBarWindow() !== win) cache.set("barWindow", String(win));
};

export async function readPicked() {
  const raw = await LocalStorage.getItem<string>("pickedNets");
  if (raw !== undefined) cache.set("pickedNets", raw);
  return parsePicked(raw);
}

export async function readPinned() {
  const raw = await LocalStorage.getItem<string>("pinnedWindow");
  if (raw !== undefined) cache.set("pinnedWindow", raw);
  return Number(raw) || undefined;
}

export async function savePicked(picked: Set<string>) {
  const raw = JSON.stringify([...picked]);
  cache.set("pickedNets", raw);
  await LocalStorage.setItem("pickedNets", raw);
}

export async function pinWindow(m: number) {
  cache.set("pinnedWindow", String(m));
  await LocalStorage.setItem("pinnedWindow", String(m));
}

export function filterFor(prefs: Preferences, stored: Set<string>, nets: Record<string, NetInfo>): Filter {
  return {
    mode: countOn(prefs.countOn),
    picked: pickedIds(stored, prefs.wifiNames, nets), // ticked networks + networks matching the typed names
    typed: !!prefs.wifiNames?.trim(),
  };
}

// One sampling round with the user's preferences; returns the ticked networks it read on the way.
export async function tick(minGapMs?: number): Promise<Set<string>> {
  const stored = await readPicked();
  const prefs = getPreferenceValues<Preferences>();
  const filter = filterFor(prefs, stored, readState(dir).nets);
  await sample(dir, { capture: prefs.capture, minGapMs, counts: (n) => counts(filter, n.id) });
  return stored;
}

export function load(win: number, stored: Set<string>) {
  const prefs = getPreferenceValues<Preferences>();
  const state = readState(dir);
  const now = Date.now();
  const spikeMB = Number(prefs.spikeMB) || 10;
  const filter = filterFor(prefs, stored, state.nets);
  const raw = readSamples(dir, now - 240 * MIN);
  const all = filterSamples(raw, filter); // history is re-filtered on every read, so changing the setting applies to it too
  const since = (m: number) => all.filter((s) => s.t >= now - m * MIN);
  const aggs = Object.fromEntries(WINDOWS.map((m) => [m, aggregate(since(m))])) as Record<number, Agg>;
  return {
    prefs,
    now,
    raw, // unfiltered: the "Now" row is live traffic, not accounting
    all,
    win,
    spikeMB,
    threshold: spikeMB * 1e6,
    filter,
    stored,
    aggs,
    ...state,
    last: [...raw].reverse().find((s) => !s.cap),
    events: spikes(since(240), spikeMB * 1e6),
  };
}
export type View = ReturnType<typeof load>;

// Changes whenever something the details view shows changed (a new row, another network, other settings).
export const viewSig = (v: View) =>
  [v.raw.length, v.last?.t, v.net, v.total?.since, v.filter.mode, [...v.filter.picked], v.spikeMB].join("|");
