// =============================================================================
// PREFERENCES
// Reads Raycast preferences and resolves them into a SidecarConfig.
// -----------------------------------------------------------------------------
// Context: The `Preferences` type is generated from package.json by `ray build`,
//   so it cannot drift from the manifest. Raycast hands the timeout back as
//   text, and leaves optional fields undefined, so both are normalised here.
// =============================================================================

import { getPreferenceValues } from "@raycast/api";

import { FIXED_TUNING } from "./keepalive";
import { createNativeBackend } from "./native";
import { keepRememberedDevice, resolveIpadName } from "./sidecar";
import { loadSelectedDevice, saveSelectedDevice } from "./state";

import type { DisplayMode, SidecarBackend, SidecarDevice } from "./backend";
import type { KeepAliveTuning } from "./keepalive";
import type { SidecarConfig } from "./sidecar";
import type { TransportPolicy } from "./transport";

/** The tuning shared by every command, before a device is chosen. */
export interface Tuning {
  readonly mode: DisplayMode;
  readonly settleTimeoutMs: number;
}

// How long to let a display converge on the requested mode before reporting.
// Generous on purpose: converge-and-hold returns the moment it settles (~1.2s),
// so a larger budget costs nothing on success and only delays the failure
// report. Not something a user should have to reason about.
const SETTLE_TIMEOUT_MS = 10_000;

/**
 * Parses an hours preference into clamped milliseconds.
 *
 * @param value - Raw preference text in hours.
 * @param fallbackHours - Value to use when the text is empty or non-numeric.
 * @param minHours - Lower bound.
 * @param maxHours - Upper bound.
 * @returns The clamped duration in milliseconds.
 */
function parseHoursMs(value: string | undefined, fallbackHours: number, minHours: number, maxHours: number): number {
  const parsed = Number.parseFloat((value ?? "").trim());
  const hours = Number.isFinite(parsed) ? parsed : fallbackHours;
  return Math.min(Math.max(hours, minHours), maxHours) * 3_600_000;
}

/**
 * Reads the auto-reconnect timing knobs from preferences, clamped.
 *
 * @returns Fully resolved keep-alive tuning.
 */
export function readKeepAliveTuning(): KeepAliveTuning {
  const prefs = getPreferenceValues<Preferences>();
  return {
    ...FIXED_TUNING,
    // The only retry knob left worth exposing: how long to keep trying an iPad
    // that reads as present but will not connect. 0 means never give up, so the
    // floor is 0 rather than 1.
    giveUpAfterMs: parseHoursMs(prefs.giveUpAfterHours, 24, 0, 720),
  };
}

/**
 * Reads the device-independent tuning from preferences.
 *
 * @returns Requested mode and settle timeout.
 */
export function readTuning(): Tuning {
  const prefs = getPreferenceValues<Preferences>();
  return { mode: prefs.displayMode, settleTimeoutMs: SETTLE_TIMEOUT_MS };
}

/**
 * Builds a config for a device already known by name.
 *
 * @param ipadName - The Sidecar device to act on.
 * @param overrides - Optional tuning overrides (e.g. a per-action mode).
 * @returns Fully resolved configuration.
 */
export function buildConfig(ipadName: string, overrides: Partial<Tuning> = {}): SidecarConfig {
  return { ...readTuning(), ...overrides, ipadName };
}

/**
 * The engine every command drives Sidecar through.
 *
 * @returns The native backend.
 *
 * NOTE: There is no choice to make. BetterDisplay was never an alternative way to
 *   drive Sidecar — the mirroring problem it fixes is CAUSED by having a
 *   BetterDisplay virtual screen as the main display, and simply does not arise
 *   without one. So it is the repair tool for a problem only it creates, reached
 *   through virtualscreens.ts, and never a transport for connect/disconnect.
 */
export function getBackend(): SidecarBackend {
  return createNativeBackend();
}

/**
 * Which transports auto-reconnect may act on.
 *
 * @returns The configured policy, defaulting to "any".
 */
export function transportPolicy(): TransportPolicy {
  const raw = getPreferenceValues<Preferences>().autoReconnectTransport;
  return raw === "cable" || raw === "wireless" ? raw : "any";
}

/**
 * The default auto-reconnect switch from preferences.
 *
 * @returns True when the preference is on (its own default).
 *
 * NOTE: This is only the default; the menu-bar toggle overrides it once used
 *   (see effectiveAutoReconnect). Gates only automatic ticks — a manual run of
 *   the command still reconnects — and is independent of Raycast's own
 *   background-refresh toggle.
 */
export function autoReconnectPreference(): boolean {
  return getPreferenceValues<Preferences>().enableAutoReconnect === true;
}

/**
 * Resolves which device name the caller should act on, before auto-detection.
 *
 * @param known - A device list the caller has already fetched. Omit it and the
 *   remembered name is returned unvalidated — deliberately, because fetching one
 *   here is a process spawn per tick.
 * @returns The preference override, else a still-valid remembered device, else
 *   the empty string to mean "auto-detect".
 *
 * NOTE: Shared by the commands and the menu bar so the preference-then-remembered
 *   ordering cannot drift between them; they previously used different orders, so
 *   a two-iPad user could act on one from the menu and another from a hotkey. It
 *   does NOT unify what happens when this returns "": the menu falls back to the
 *   first listed device, while the commands refuse to guess between several.
 */
export async function resolveDeviceOverride(known?: readonly SidecarDevice[]): Promise<string> {
  // Priority: an explicit preference override, then a device remembered from a
  // previous run or pinned from the menu bar.
  const pinned = (getPreferenceValues<Preferences>().ipadName ?? "").trim();
  if (pinned !== "") {
    return pinned;
  }

  const remembered = await loadSelectedDevice();
  if (remembered === "") {
    return "";
  }
  // Validated ONLY against a list the caller already had. Fetching one here cost
  // an extra `betterdisplaycli` process spawn on every background tick, forever —
  // measurably heavy, since each spawn loads the whole BetterDisplay binary. The
  // menu bar has a list and validates every render, which is soon enough to catch
  // a renamed iPad; a tick without one keeps the remembered name.
  return known === undefined ? remembered : keepRememberedDevice(remembered, known);
}

/**
 * Builds the config every command runs on, auto-detecting the iPad if needed.
 *
 * @param backend - The engine, used to auto-detect the device when unset.
 * @returns Fully resolved configuration.
 */
export async function loadConfig(backend: SidecarBackend): Promise<SidecarConfig> {
  const override = await resolveDeviceOverride();
  const ipadName = await resolveIpadName(backend, override);

  // An out-of-range iPad drops out of the device list entirely (verified: both
  // SidecarCore and `get --sidecarList` return nothing once it is far enough
  // away), which would make auto-detection throw and take the whole tick with
  // it. Remembering the name the first time it resolves keeps presence tracking
  // and the menu bar working while the iPad is away.
  //
  // Gated on nothing being remembered yet, NOT on `override === ""` — those
  // differ when a remembered name was just invalidated, and writing then would
  // silently replace a device the user picked from the menu with a different one.
  if ((await loadSelectedDevice()) === "") {
    await saveSelectedDevice(ipadName);
  }

  return buildConfig(ipadName);
}
