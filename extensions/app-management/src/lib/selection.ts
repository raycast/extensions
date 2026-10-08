// The list's current selection, shared with the two hotkey commands (SPEC.md §4.2 revision, owner 2026-09-30).
// Raycast's hotkey recorder works only for commands, so "quit the selected app" as a Hyper hotkey has to be a command
// that reads what the list last selected. Pure rules here; storage in src/storage.ts.

export const SELECTION_STORAGE_KEY = "selection.v1";
export const LIST_STATE_STORAGE_KEY = "listState.v1";

/** Grace period after the list unmounts: Raycast may unload the list before the hotkey command starts. */
export const CLOSED_GRACE_MS = 3000;
/**
 * A selection older than this is never acted on, even if the list still reports itself open: one observed exit path
 * (Raycast hiding its window) did not run the list's unmount cleanup, so the open flag alone is not trusted.
 */
export const SELECTION_FRESH_MS = 30_000;

export interface StoredSelection {
  key: string;
  name: string;
  bundleId?: string;
  pids: number[];
  /** Set when a window row is selected (owner, 2026-10-08): the hotkey then closes that window instead of quitting. */
  window?: { pid: number; wid: number };
  /** The app's discovered window count at selection time, so the hotkey quits instead of closing a last window. */
  windowCount?: number;
  /** The list row to select after the hotkey closes `window` (a sibling window, else the app row). */
  afterClose?: string;
  at: number;
}

/** What Quit Selected App does: close the selected window while its app has others, otherwise quit the app. */
export type QuitTarget = { kind: "window"; pid: number; wid: number } | { kind: "app" };

export function quitTarget(selection: Partial<StoredSelection>): QuitTarget {
  const { window, windowCount } = selection;
  return window && (windowCount ?? 0) >= 2 ? { kind: "window", pid: window.pid, wid: window.wid } : { kind: "app" };
}

const positiveInt = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n > 0;

export interface ListState {
  open: boolean;
  /** When the list last mounted or unmounted. */
  at: number;
  /** The mount that wrote this; a stale unmount never overwrites a newer mount's "open". */
  id?: string;
}

export function parseSelection(raw: unknown): StoredSelection | undefined {
  if (typeof raw !== "string") return undefined;
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    if (typeof v !== "object" || v === null) return undefined;
    if (typeof v.key !== "string" || typeof v.name !== "string" || typeof v.at !== "number") return undefined;
    if (!Array.isArray(v.pids) || !v.pids.every((p) => typeof p === "number")) return undefined;
    const w = v.window as Record<string, unknown> | undefined;
    return {
      key: v.key,
      name: v.name,
      bundleId: typeof v.bundleId === "string" ? v.bundleId : undefined,
      pids: v.pids as number[],
      // A malformed window part is dropped, never guessed: the hotkey then quits the app as before.
      ...(w && positiveInt(w.pid) && positiveInt(w.wid) ? { window: { pid: w.pid, wid: w.wid } } : {}),
      ...(positiveInt(v.windowCount) ? { windowCount: v.windowCount } : {}),
      ...(typeof v.afterClose === "string" ? { afterClose: v.afterClose } : {}),
      at: v.at,
    };
  } catch {
    return undefined;
  }
}

export function parseListState(raw: unknown): ListState | undefined {
  if (typeof raw !== "string") return undefined;
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    if (typeof v?.open !== "boolean" || typeof v.at !== "number") return undefined;
    return typeof v.id === "string" ? { open: v.open, at: v.at, id: v.id } : { open: v.open, at: v.at };
  } catch {
    return undefined;
  }
}

/**
 * The selection a hotkey command may act on: a fresh one (≤ SELECTION_FRESH_MS), unless the list was closed after it
 * was made and more than the grace period ago (the hotkey itself may have just closed the list).
 */
export function actionableSelection(
  selection: StoredSelection | undefined,
  state: ListState | undefined,
  now: number,
): StoredSelection | undefined {
  if (!selection) return undefined;
  if (now - selection.at > SELECTION_FRESH_MS) return undefined;
  if (state && !state.open && state.at > selection.at && now - state.at > CLOSED_GRACE_MS) return undefined;
  return selection;
}
