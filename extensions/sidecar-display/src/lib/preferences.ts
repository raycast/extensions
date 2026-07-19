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
import { createNativeBackend } from "./native";
import { resolveIpadName } from "./sidecar";
import { loadSelectedDevice } from "./state";

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
 * Parses a clamped integer preference, falling back when unset or invalid.
 *
 * @param value - Raw preference text.
 * @param fallback - Value to use when the text is empty or non-numeric.
 * @param min - Lower bound.
 * @param max - Upper bound.
 * @returns The clamped integer.
 */
function parseIntClamped(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt((value ?? "").trim(), 10);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, min), max);
}

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
 * Reads the auto-reconnect timing knobs from preferences, clamped.
 *
 * @returns Fully resolved keep-alive tuning.
 */
export function readKeepAliveTuning(): KeepAliveTuning {
  const prefs = getPreferenceValues<Preferences>();
  const backoffBaseMs = parseSecondsMs(prefs.backoffBaseSeconds, 15, 1, 3_600);
  // The cap is a ceiling on the doubling backoff, so it can never sit below the
  // base — otherwise every attempt would collapse to the (smaller) cap.
  const backoffCapMs = Math.max(parseSecondsMs(prefs.backoffCapSeconds, 60, 1, 3_600), backoffBaseMs);
  return {
    fastAttempts: parseIntClamped(prefs.fastReconnectAttempts, 3, 1, 100),
    backoffBaseMs,
    backoffCapMs,
    dormantRetryMs: parseSecondsMs(prefs.slowRetrySeconds, 300, 30, 86_400),
    wakeGapMs: parseSecondsMs(prefs.wakeThresholdSeconds, 120, 30, 3_600),
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

  return buildConfig(await resolveIpadName(backend, override));
}
