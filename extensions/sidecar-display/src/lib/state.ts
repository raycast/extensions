// =============================================================================
// PERSISTENT STATE
// Stores keep-alive bookkeeping and the chosen device across command runs.
// -----------------------------------------------------------------------------
// Context: Raycast commands are short-lived and share nothing in memory, so the
//   keep-alive intent and the selected device must live in LocalStorage. This
//   module is the only place that touches it.
// =============================================================================

import { LocalStorage } from "@raycast/api";

import { INITIAL_STATE, stateForIntent } from "./keepalive";

import type { KeepAliveState, LinkIntent, Reachability } from "./keepalive";

const KEEP_ALIVE_KEY = "keepAliveState";
const DEVICE_KEY = "selectedDeviceName";
const AUTO_RECONNECT_KEY = "autoReconnectOverride";

/**
 * Reads the persisted keep-alive state, falling back to the initial state.
 *
 * @returns The stored state, or the initial state when nothing is stored or the
 *   stored value is unreadable.
 */
export async function loadKeepAliveState(): Promise<KeepAliveState> {
  const raw = await LocalStorage.getItem<string>(KEEP_ALIVE_KEY);
  if (raw === undefined) {
    return INITIAL_STATE;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<KeepAliveState>;
    return {
      intent: parsed.intent === "connected" ? "connected" : "disconnected",
      failedAttempts: typeof parsed.failedAttempts === "number" ? parsed.failedAttempts : 0,
      lastAttemptAtMs: typeof parsed.lastAttemptAtMs === "number" ? parsed.lastAttemptAtMs : 0,
      lastTickAtMs: typeof parsed.lastTickAtMs === "number" ? parsed.lastTickAtMs : 0,
      // Absent from state written before the probe existed; 0 is the correct
      // reading of "no chase running, nothing seen absent yet".
      chasingSinceMs: typeof parsed.chasingSinceMs === "number" ? parsed.chasingSinceMs : 0,
      absentReads: typeof parsed.absentReads === "number" ? parsed.absentReads : 0,
      announcedGiveUp: parsed.announcedGiveUp === true,
      lastLinkUp: parsed.lastLinkUp === true,
      lastReachability: parseReachability(parsed.lastReachability),
    };
  } catch {
    return INITIAL_STATE;
  }
}

/**
 * Narrows a stored probe reading back to the union.
 *
 * @param value - Whatever JSON.parse produced.
 * @returns The reading, or "unknown" for anything unrecognised — the honest
 *   default, and what state written before the probe existed should mean.
 */
function parseReachability(value: unknown): Reachability {
  return value === "reachable" || value === "absent" ? value : "unknown";
}

/**
 * Persists the keep-alive state.
 *
 * @param state - State to store.
 */
export async function saveKeepAliveState(state: KeepAliveState): Promise<void> {
  await LocalStorage.setItem(KEEP_ALIVE_KEY, JSON.stringify(state));
}

/**
 * Records the user's explicit connect/disconnect intent.
 *
 * @param intent - What the user just asked for.
 *
 * NOTE: Re-arms (or stops) keep-alive by resetting the retry budget, so this is
 *   called from every manual connect and disconnect, and from the menu bar.
 */
export async function recordIntent(intent: LinkIntent): Promise<void> {
  await saveKeepAliveState(stateForIntent(intent));
}

/**
 * Reads the menu-bar auto-reconnect override, if the user has set one.
 *
 * @returns True/false when the menu toggle has been used, or null when it never
 *   has (so the preference default applies).
 */
export async function loadAutoReconnectOverride(): Promise<boolean | null> {
  const raw = await LocalStorage.getItem<string>(AUTO_RECONNECT_KEY);
  if (raw === "true") {
    return true;
  }
  if (raw === "false") {
    return false;
  }
  return null;
}

/**
 * Persists the menu-bar auto-reconnect override.
 *
 * @param enabled - The switch state the user chose from the menu bar.
 */
export async function saveAutoReconnectOverride(enabled: boolean): Promise<void> {
  await LocalStorage.setItem(AUTO_RECONNECT_KEY, enabled ? "true" : "false");
}

/**
 * Reads the user's pinned device name, if any.
 *
 * @returns The stored device name, or the empty string when none is stored.
 */
export async function loadSelectedDevice(): Promise<string> {
  return (await LocalStorage.getItem<string>(DEVICE_KEY)) ?? "";
}

/**
 * Persists the chosen device name for other commands to read.
 *
 * @param name - Device name to store.
 */
export async function saveSelectedDevice(name: string): Promise<void> {
  await LocalStorage.setItem(DEVICE_KEY, name);
}
