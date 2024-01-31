import { getPreferenceValues, updateCommandMetadata } from "@raycast/api";
import { getCycleCollection, getRecoveryCollection, getSleepCollection } from "./api/background";
import { calcCals, formatHeartRate, formatStrain } from "./helpers/formats";
import { getRecoveryEmoji } from "./helpers/recovery";

enum DisplayPreference {
  show = "show",
  hide = "hide",
}

interface OverviewPreferences {
  recovery: DisplayPreference;
  strain: DisplayPreference;
  sleepPerformance: DisplayPreference;
  calories: DisplayPreference;
  rhr: DisplayPreference;
  hrv: DisplayPreference;
}

export default async function Command() {
  const preferences = getPreferenceValues<OverviewPreferences>();
  const recoveryCollection = await getRecoveryCollection({ limit: 1 });
  const cycleCollection = await getCycleCollection({ limit: 1 });
  const sleepCollection = await getSleepCollection({ limit: 1 });

  const recovery = recoveryCollection?.records?.[0]?.score?.recovery_score || 0;
  const strain = formatStrain(cycleCollection?.records?.[0]?.score?.strain) || 0;
  const hrv = Math.round(recoveryCollection?.records?.[0]?.score?.hrv_rmssd_milli || 0);
  const restingHeartRate = formatHeartRate(recoveryCollection?.records?.[0]?.score?.resting_heart_rate) || 0;

  const cals = calcCals(cycleCollection?.records?.[0]?.score?.kilojoule) || 0;

  const sleepPerformancePercentage = sleepCollection?.records?.[0]?.score?.sleep_performance_percentage || 0;

  const subtitleComponents = [];

  if (preferences.recovery != DisplayPreference.hide) {
    subtitleComponents.push(`${getRecoveryEmoji(recovery)} ${recovery}% Recovery`);
  }
  if (preferences.strain != DisplayPreference.hide) {
    subtitleComponents.push(`${strain} Strain`);
  }
  if (preferences.sleepPerformance != DisplayPreference.hide) {
    subtitleComponents.push(`${sleepPerformancePercentage}% Sleep`);
  }
  if (preferences.calories != DisplayPreference.hide) {
    subtitleComponents.push(`${cals} Cal`);
  }
  if (preferences.rhr != DisplayPreference.hide) {
    subtitleComponents.push(`${restingHeartRate} RHR`);
  }
  if (preferences.hrv != DisplayPreference.hide) {
    subtitleComponents.push(`${hrv} HRV`);
  }

  updateCommandMetadata({
    subtitle: subtitleComponents.join("  ·  "),
  });
}
