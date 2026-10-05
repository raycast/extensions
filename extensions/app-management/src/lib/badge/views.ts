// Copied from badge-count-raycast src/lib/views.ts on 2026-09-30, unchanged except this header; storage keys renamed (listView.v1 -> filter.v1, pinnedApps.v1 -> pins.v1); ListView gains allApps as the default; otherView becomes a three-way cycle (SPEC.md §4.4, §5.2, §5.3)
// Pure pin, view and filtering logic (SPEC-PINNED-VIEWS.md sections 3 and 4).
// No Raycast imports, so the unit tests can load this file directly.
import type { DockRead, RowState } from "./badge";
import type { SelectedApp } from "./config";

/** SPEC.md §4.4: the two badge-project filters plus the merged command's default, All Apps. */
export type ListView = "allApps" | "pinnedAndBadged" | "badgedOnly";

export const DEFAULT_VIEW: ListView = "allApps";
export const VIEW_ORDER: readonly ListView[] = ["allApps", "pinnedAndBadged", "badgedOnly"];
export const VIEW_STORAGE_KEY = "filter.v1";
export const PINS_STORAGE_KEY = "pins.v1";

export const VIEW_TITLES: Record<ListView, string> = {
  allApps: "All Apps",
  pinnedAndBadged: "Pinned + Badged",
  badgedOnly: "Badged Only",
};

/** The stored view, or the default for anything unrecognised. Never throws, never writes. */
export function parseView(raw: unknown): ListView {
  return raw === "allApps" || raw === "pinnedAndBadged" || raw === "badgedOnly" ? raw : DEFAULT_VIEW;
}

/** ⌘⇧V cycle: All Apps → Pinned + Badged → Badged Only → All Apps (SPEC.md §4.2). */
export function otherView(view: ListView): ListView {
  return VIEW_ORDER[(VIEW_ORDER.indexOf(view) + 1) % VIEW_ORDER.length];
}

export type ParsedPins = { status: "missing" } | { status: "corrupt" } | { status: "ok"; pins: string[] };

/** Same rules as parseSelection: an empty array is a valid, deliberate "nothing pinned". */
export function parsePins(raw: unknown): ParsedPins {
  if (raw === undefined) return { status: "missing" };
  if (typeof raw !== "string") return { status: "corrupt" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: "corrupt" };
  }
  if (!Array.isArray(parsed)) return { status: "corrupt" };
  const pins: string[] = [];
  for (const entry of parsed) {
    if (typeof entry !== "string" || !entry) return { status: "corrupt" };
    if (!pins.includes(entry)) pins.push(entry);
  }
  return { status: "ok", pins };
}

export function serializePins(pins: string[]): string {
  return JSON.stringify(pins);
}

/** Migration seed: every tracked app is pinned, so the familiar list stays visible. */
export function seedPins(apps: SelectedApp[]): string[] {
  return apps.map((app) => app.bundleId);
}

/** Drop pins for apps that are no longer tracked. Keeps the pin order. */
export function prunePins(pins: string[], apps: SelectedApp[]): string[] {
  const tracked = new Set(apps.map((app) => app.bundleId));
  return pins.filter((id) => tracked.has(id));
}

export function togglePin(pins: string[], bundleId: string): string[] {
  return pins.includes(bundleId) ? pins.filter((id) => id !== bundleId) : [...pins, bundleId];
}

/** A current Dock badge other than "0". Loading and unavailable are unknown, not badged. */
export function isBadged(state: RowState): boolean {
  return state.kind === "numeric" || state.kind === "nonNumeric";
}

/**
 * Truth table of the badge project's section 4, for tracked apps only. Unknown (unavailable) never hides a row in
 * Pinned + Badged. All Apps is decided in src/lib/rows.ts because it also depends on windows; here it answers the
 * tracked-app half of that rule (pinned, badged, or unavailable).
 */
export function rowVisible(state: RowState, pinned: boolean, view: ListView): boolean {
  if (view === "badgedOnly") return isBadged(state);
  return pinned || isBadged(state) || state.kind === "unavailable";
}

export type EmptyState = "noApps" | "reading" | "failed" | "noneBadged" | "nonePinnedOrBadged";

/**
 * Which empty view to render when no row is visible. Returns undefined when rows
 * are visible or the selection has not loaded. A failed read is checked before
 * the "nothing badged" states, so a failure can never look like zero badges.
 */
export function emptyState(
  view: ListView,
  appCount: number | undefined,
  visibleCount: number,
  read: DockRead | undefined,
): EmptyState | undefined {
  if (appCount === undefined || visibleCount > 0) return undefined;
  if (appCount === 0) return "noApps";
  if (!read) return "reading";
  if (!read.ok) return "failed";
  return view === "badgedOnly" ? "noneBadged" : "nonePinnedOrBadged";
}

/** Minimal key-value interface matching Raycast LocalStorage, so storage logic is testable. */
export type KeyValueStore = {
  getItem(key: string): Promise<unknown>;
  setItem(key: string, value: string): Promise<void>;
};

export type LoadedPins = { pins: string[]; notice?: "seeded" | "reseeded-corrupt" };

/** Section 3.3. Missing or corrupt pins become "all tracked apps pinned" and are saved. */
export async function loadPinsFrom(store: KeyValueStore, apps: SelectedApp[]): Promise<LoadedPins> {
  const parsed = parsePins(await store.getItem(PINS_STORAGE_KEY));
  if (parsed.status === "ok") return { pins: prunePins(parsed.pins, apps) };
  const pins = seedPins(apps);
  await store.setItem(PINS_STORAGE_KEY, serializePins(pins));
  if (parsed.status === "corrupt") return { pins, notice: "reseeded-corrupt" };
  return apps.length > 0 ? { pins, notice: "seeded" } : { pins };
}

/** Never writes: an unknown or missing value simply means the default view. */
export async function loadViewFrom(store: KeyValueStore): Promise<ListView> {
  return parseView(await store.getItem(VIEW_STORAGE_KEY));
}
