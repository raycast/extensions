// =============================================================================
// PREFERENCES
// Reads Raycast preferences and resolves them into a SidecarConfig.
// -----------------------------------------------------------------------------
// Context: The `Preferences` type is generated from package.json by `ray build`,
//   so it cannot drift from the manifest. Raycast hands the timeout back as
//   text, and leaves optional fields undefined, so both are normalised here.
// =============================================================================

import { getPreferenceValues } from "@raycast/api";
import { existsSync } from "node:fs";

import { createBetterDisplayBackend } from "./betterdisplay";
import { FIXED_TUNING } from "./keepalive";
import { createNativeBackend } from "./native";
import { resolveIpadName } from "./sidecar";
import { loadSelectedDevice, saveSelectedDevice } from "./state";

import type { DisplayMode, SidecarBackend } from "./backend";
import type { KeepAliveTuning } from "./keepalive";
import type { SidecarConfig } from "./sidecar";

/** The tuning shared by every command, before a device is chosen. */
export interface Tuning {
  readonly mode: DisplayMode;
  readonly settleTimeoutMs: number;
}

const MIN_TIMEOUT_SECONDS = 2;
const MAX_TIMEOUT_SECONDS = 60;
const DEFAULT_TIMEOUT_SECONDS = 6;

/**
 * Parses a seconds preference into clamped milliseconds.
 *
 * @param value - Raw preference text in seconds.
 * @param fallbackSeconds - Value to use when the text is empty or non-numeric.
 * @param minSeconds - Lower bound in seconds.
 * @param maxSeconds - Upper bound in seconds.
 * @returns The clamped duration in milliseconds.
 */
function parseSecondsMs(
  value: string | undefined,
  fallbackSeconds: number,
  minSeconds: number,
  maxSeconds: number,
): number {
  const parsed = Number.parseFloat((value ?? "").trim());
  const seconds = Number.isFinite(parsed) ? parsed : fallbackSeconds;
  return Math.min(Math.max(seconds, minSeconds), maxSeconds) * 1_000;
}

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
  return {
    mode: prefs.displayMode,
    settleTimeoutMs: parseSecondsMs(
      prefs.settleTimeoutSeconds,
      DEFAULT_TIMEOUT_SECONDS,
      MIN_TIMEOUT_SECONDS,
      MAX_TIMEOUT_SECONDS,
    ),
  };
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
 * The configured path to the `betterdisplaycli` binary.
 *
 * @returns The trimmed CLI path.
 *
 * NOTE: The virtual-screen reconnect uses this regardless of the selected
 *   engine, since virtual screens are a BetterDisplay construct.
 */
export function getBetterDisplayCliPath(): string {
  return getPreferenceValues<Preferences>().betterDisplayCliPath.trim();
}

/**
 * Whether the `betterdisplaycli` binary is present.
 *
 * @returns True when the configured CLI path exists on disk.
 *
 * NOTE: Gates the BetterDisplay engine (under Automatic) and every
 *   virtual-screen reconnect, which cannot work without BetterDisplay.
 */
export function betterDisplayAvailable(): boolean {
  const path = getBetterDisplayCliPath();
  return path !== "" && existsSync(path);
}

/**
 * Builds the engine selected in preferences.
 *
 * @returns The chosen engine; under Automatic, BetterDisplay when its CLI is
 *   present, otherwise Native.
 */
export function getBackend(): SidecarBackend {
  const prefs = getPreferenceValues<Preferences>();
  const native = (): SidecarBackend => createNativeBackend();
  const betterDisplay = (): SidecarBackend => createBetterDisplayBackend(getBetterDisplayCliPath());

  if (prefs.backend === "native") {
    return native();
  }
  if (prefs.backend === "betterdisplay") {
    return betterDisplay();
  }
  // Automatic: prefer BetterDisplay when it is installed.
  return betterDisplayAvailable() ? betterDisplay() : native();
}

/**
 * Whether to fix mirroring automatically after a fresh connect.
 *
 * @returns True only when the option is on and BetterDisplay is available.
 */
export function shouldFixMirrorAfterConnect(): boolean {
  return getPreferenceValues<Preferences>().fixMirrorAfterConnect === true && betterDisplayAvailable();
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
 * Builds the config every command runs on, auto-detecting the iPad if needed.
 *
 * @param backend - The engine, used to auto-detect the device when unset.
 * @returns Fully resolved configuration.
 */
export async function loadConfig(backend: SidecarBackend): Promise<SidecarConfig> {
  // Priority: an explicit preference override, then a device pinned from the
  // menu bar, then auto-detection.
  const prefs = getPreferenceValues<Preferences>();
  const override = (prefs.ipadName ?? "").trim() || (await loadSelectedDevice());
  const ipadName = await resolveIpadName(backend, override);

  // An out-of-range iPad drops out of the device list entirely (verified: both
  // SidecarCore and `get --sidecarList` return nothing once it is far enough
  // away), which would make auto-detection throw and take the whole tick with
  // it. Remembering the name the first time it resolves keeps presence tracking
  // and the menu bar working while the iPad is away. Only reached when exactly
  // one device is paired — resolveIpadName refuses to guess between several.
  if (override === "") {
    await saveSelectedDevice(ipadName);
  }

  return buildConfig(ipadName);
}
