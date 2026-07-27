import { UsageResult, UsageWindow, effectiveUsedPercent } from "./models";
import { formatCountdown, formatPercent } from "./format";

export interface ThresholdConfig {
  session: number[];
  weekly: number[];
  resetWarnings: number[];
}

export interface UsageAlert {
  /** Window identity plus marker; unique per window instance. */
  key: string;
  title: string;
  message: string;
}

/** Fired markers, keyed by window instance. */
export type AlertState = Record<string, string[]>;

/**
 * A window's identity includes its reset time, so when the limit rolls over the
 * key changes and every threshold for it becomes eligible again. That removes
 * the need to detect resets separately, and makes a reset impossible to miss
 * even if it happens between two background runs.
 */
export function windowKey(providerId: string, window: UsageWindow): string {
  const reset = window.resetsAt ? window.resetsAt.getTime() : "none";
  return `${providerId}:${window.id}:${reset}`;
}

/**
 * Used when the provider does not state a window length. Claude sends absolute
 * reset stamps, so only rounding noise has to be absorbed.
 */
const DEFAULT_RESET_TOLERANCE_MS = 5 * 60_000;

/**
 * How far apart two reset times may be while still describing the same window.
 *
 * Codex derives some reset times from a duration, and an unconsumed window
 * reports the whole window length instead of a countdown — so its derived reset
 * advances by the polling interval on every run. Comparing exactly, or against
 * a fixed tolerance smaller than that interval, would read each run as a fresh
 * window and replay every alert already sent.
 *
 * Half a window separates the two cases cleanly: a genuine rollover moves the
 * reset by a full window, while drift is bounded by the polling interval, which
 * is necessarily far shorter than the limit it is polling.
 */
function resetToleranceMs(window: UsageWindow): number {
  if (window.windowSeconds && Number.isFinite(window.windowSeconds) && window.windowSeconds > 0) {
    return (window.windowSeconds * 1000) / 2;
  }
  return DEFAULT_RESET_TOLERANCE_MS;
}

function matchStoredKey(state: AlertState, providerId: string, window: UsageWindow): string | null {
  if (!window.resetsAt) return null;

  const prefix = `${providerId}:${window.id}:`;
  const target = window.resetsAt.getTime();
  const tolerance = resetToleranceMs(window);
  let best: string | null = null;
  let bestDelta = Infinity;

  for (const key of Object.keys(state)) {
    if (!key.startsWith(prefix)) continue;
    // Window ids may themselves contain colons, so anything left after the
    // prefix that is not a bare timestamp belongs to a different window.
    const stored = Number.parseInt(key.slice(prefix.length), 10);
    if (!Number.isFinite(stored)) continue;

    const delta = Math.abs(stored - target);
    if (delta <= tolerance && delta < bestDelta) {
      best = key;
      bestDelta = delta;
    }
  }

  return best;
}

function thresholdsFor(window: UsageWindow, config: ThresholdConfig): number[] {
  if (window.kind === "session") return config.session;
  if (window.kind === "weekly") return config.weekly;
  return [];
}

/**
 * Only primary windows raise alerts. Per-model scoped windows stay visible in
 * the dashboard but would otherwise turn every refresh into a wall of noise.
 */
export function collectAlerts(
  results: UsageResult[],
  config: ThresholdConfig,
  state: AlertState,
  now: Date = new Date(),
): { alerts: UsageAlert[]; nextState: AlertState } {
  const alerts: UsageAlert[] = [];
  const nextState: AlertState = pruneState(state, now);

  for (const result of results) {
    for (const window of result.windows) {
      if (!window.isPrimary) continue;

      // Reuse the stored key when one matches, so the identity stays put
      // instead of drifting with each derived timestamp.
      const key = matchStoredKey(nextState, result.provider, window) ?? windowKey(result.provider, window);
      const fired = new Set(nextState[key] ?? []);
      const percent = effectiveUsedPercent(window, now);

      for (const threshold of thresholdsFor(window, config)) {
        const marker = `t:${threshold}`;
        if (fired.has(marker) || percent < threshold) continue;
        fired.add(marker);
        alerts.push({
          key: `${key}:${marker}`,
          title: `${result.displayName} · ${window.label} ${formatPercent(percent)}`,
          message: resetSuffix(window, now) ?? `Crossed ${threshold}%.`,
        });
      }

      // A reset warning on an unused window is pure noise, so it is gated on
      // the window actually having been spent against.
      if (percent > 0 && window.resetsAt) {
        const minutesLeft = (window.resetsAt.getTime() - now.getTime()) / 60_000;
        for (const warning of config.resetWarnings) {
          const marker = `r:${warning}`;
          if (fired.has(marker) || minutesLeft > warning || minutesLeft <= 0) continue;
          fired.add(marker);
          alerts.push({
            key: `${key}:${marker}`,
            title: `${result.displayName} · ${window.label} resets soon`,
            message: `${formatPercent(percent)} used, resets in ${formatCountdown(window.resetsAt, now) ?? "moments"}.`,
          });
        }
      }

      if (fired.size > 0) nextState[key] = [...fired];
    }
  }

  return { alerts, nextState };
}

function resetSuffix(window: UsageWindow, now: Date): string | null {
  const countdown = formatCountdown(window.resetsAt, now);
  return countdown ? `Resets in ${countdown}.` : null;
}

/**
 * Drops state for windows whose reset time has already passed; those keys can
 * never match again, so keeping them would grow LocalStorage without bound.
 */
export function pruneState(state: AlertState, now: Date = new Date()): AlertState {
  const pruned: AlertState = {};
  for (const [key, markers] of Object.entries(state)) {
    const resetPart = key.split(":").pop();
    if (resetPart && resetPart !== "none") {
      const resetMs = Number.parseInt(resetPart, 10);
      if (Number.isFinite(resetMs) && resetMs <= now.getTime()) continue;
    }
    pruned[key] = markers;
  }
  return pruned;
}
