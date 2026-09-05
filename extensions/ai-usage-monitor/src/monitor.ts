import { getPreferenceValues, updateCommandMetadata } from "@raycast/api";
import { formatPercent, parseMinutes, parseThresholds } from "./core/format";
import { UsageResult, effectiveUsedPercent } from "./core/models";
import { loadAlertState, recordCheck, saveAlertState } from "./core/storage";
import { ThresholdConfig, collectAlerts } from "./core/thresholds";
import { deliver } from "./core/notification";
import { fetchAllUsage } from "./providers";

const DEFAULT_SESSION = [50, 75, 90, 95];
const DEFAULT_WEEKLY = [75, 90];
const DEFAULT_RESET_WARNINGS = [30, 10];

export function readThresholdConfig(prefs: Partial<Preferences.Monitor>): ThresholdConfig {
  return {
    session: parseThresholds(prefs.sessionThresholds, DEFAULT_SESSION),
    weekly: parseThresholds(prefs.weeklyThresholds, DEFAULT_WEEKLY),
    resetWarnings: parseMinutes(prefs.resetWarnings, DEFAULT_RESET_WARNINGS),
  };
}

/**
 * Condensed one-line summary shown under the command in Raycast's root search,
 * so current usage is visible without opening anything at all.
 */
export function buildSubtitle(results: UsageResult[], now: Date = new Date()): string {
  if (results.length === 0) return "No provider available";

  return results
    .map((result) => {
      const worst = result.windows
        .filter((window) => window.isPrimary)
        .reduce<number | null>((max, window) => {
          const percent = effectiveUsedPercent(window, now);
          return max === null || percent > max ? percent : max;
        }, null);
      return worst === null ? `${result.displayName} —` : `${result.displayName} ${formatPercent(worst)}`;
    })
    .join(" · ");
}

export default async function Command(): Promise<void> {
  const outcomes = await fetchAllUsage();
  const results = outcomes.flatMap((outcome) => (outcome.ok ? [outcome.result] : []));

  await recordCheck();

  // With no readable provider there is nothing to compare against; leaving the
  // stored state untouched keeps already-fired thresholds from replaying once
  // the provider recovers.
  if (results.length === 0) {
    const reasons = outcomes.flatMap((outcome) => (outcome.ok ? [] : [`${outcome.displayName}: ${outcome.detail}`]));
    await updateCommandMetadata({ subtitle: reasons[0] ?? "No provider available" });
    return;
  }

  const config = readThresholdConfig(getPreferenceValues<Preferences.Monitor>());
  const state = await loadAlertState();
  const { alerts, nextState } = collectAlerts(results, config, state);

  // State is persisted before delivery so a crash mid-delivery cannot cause the
  // same threshold to fire again on the next run.
  await saveAlertState(nextState);
  await deliver(alerts);
  await updateCommandMetadata({ subtitle: buildSubtitle(results) });
}
