import type { PinnedTab } from "./safari";

export const CONFIRMED_TAB_MAX_AGE_MS = 10 * 60 * 1000;

/** What the close-tab confirmation saw: the tab it showed, or why there was no tab to show. */
export type ConfirmedTab = { target: string; confirmedAt: number } & ({ tab: PinnedTab } | { error: string });

export const NO_CONFIRMATION_ERROR =
  "Nothing was closed: there is no matching confirmation for this tab (it is missing, expired, or was given for another tab). Ask to close the tab again.";

/** Identifies what a close-tab call targets: a position, or the current tab. */
export const closeTarget = (position?: { windowId: number; index: number }) =>
  JSON.stringify(position ? [position.windowId, position.index] : "current");

/**
 * Picks the tab to close from what the confirmation stored. Never looks the tab up again: without a fresh
 * confirmation for the same target, the result is an error and nothing is closed.
 */
export function takeConfirmed(
  stored: string | undefined,
  target: string,
  now: number,
): { tab: PinnedTab } | { error: string } {
  if (!stored) return { error: NO_CONFIRMATION_ERROR };
  let confirmed: ConfirmedTab;
  try {
    confirmed = JSON.parse(stored) as ConfirmedTab;
  } catch {
    return { error: NO_CONFIRMATION_ERROR };
  }
  const isFresh = now - confirmed.confirmedAt >= 0 && now - confirmed.confirmedAt < CONFIRMED_TAB_MAX_AGE_MS;
  if (!isFresh || confirmed.target !== target) return { error: NO_CONFIRMATION_ERROR };
  return "tab" in confirmed ? { tab: confirmed.tab } : { error: confirmed.error };
}
