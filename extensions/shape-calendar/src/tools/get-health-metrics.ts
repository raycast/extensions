import { getHealthMetrics } from "../api/client";
import { toLocalDateString } from "../utils";

type Input = {
  /**
   * Start date in ISO format (YYYY-MM-DD). Defaults to 14 days ago.
   */
  from?: string;
  /**
   * End date in ISO format (YYYY-MM-DD). Defaults to today.
   */
  to?: string;
  /**
   * Only return values from this source. Omit to get one merged record per day.
   */
  source?: "garmin" | "apple";
  /**
   * Exact metric field ids to return. Omit to get everything recorded each day, which is the right default when you don't know what the user tracks.
   */
  metrics?: (
    | "restingHR"
    | "hrvMs"
    | "respiration"
    | "spo2"
    | "skinTemp"
    | "skinTempDeviation"
    | "hrRecovery"
    | "walkingHR"
    | "sleepStart"
    | "sleepDurationSec"
    | "sleepDeepSec"
    | "sleepLightSec"
    | "sleepRemSec"
    | "sleepAwakeSec"
    | "sleepScore"
    | "vo2max"
    | "vo2maxCycling"
    | "fitnessAge"
    | "avgStress"
    | "maxStress"
    | "bodyBatteryCharged"
    | "bodyBatteryDrained"
    | "weightKg"
    | "bodyFatPct"
    | "bmi"
    | "muscleMassKg"
    | "boneMassKg"
    | "bodyWaterPct"
    | "leanBodyMassKg"
    | "steps"
    | "activeCalories"
    | "intensityMinutes"
    | "bpSystolic"
    | "bpDiastolic"
    | "bpPulse"
    | "bpSource"
  )[];
};

export default async function (input: Input) {
  const today = new Date();
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(today.getDate() - 14);

  return getHealthMetrics({
    from: input.from || toLocalDateString(twoWeeksAgo),
    to: input.to || toLocalDateString(today),
    source: input.source,
    metrics: input.metrics,
  });
}
