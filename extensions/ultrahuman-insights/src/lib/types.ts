// Subset of the Ultrahuman Partner API daily_metrics response.
// All numeric fields are optional because the API omits metrics that
// aren't available (e.g. glucose fields on a Ring-only account, or
// fields not yet computed for the current day).
//
// Units are inferred from Ultrahuman's product UI:
//   - sleep durations: minutes
//   - heart rate: bpm
//   - HRV: ms
//   - temperature: degrees Celsius (deviation in same units)
//   - scores/indices: 0–100
// Confirm against the live response on first dev run; adjust if needed.

export interface DailyMetrics {
  // Heart rate
  hr?: number;
  night_rhr?: number;
  hr_drop?: number;
  hrv?: number;

  // Sleep
  sleep_score?: number;
  total_sleep?: number;
  sleep_efficiency?: number;
  rem_sleep?: number;
  deep_sleep?: number;
  light_sleep?: number;
  restorative_sleep?: number; // percentage (0–100), NOT minutes
  sleep_cycles?: number;
  tosses_turns?: number;
  morning_alertness?: number;
  movements?: number;

  // Indices
  recovery_index?: number;
  movement_index?: number;

  // Body
  temp?: number;
  avg_body_temperature?: number;
  temperature_deviation?: number;
  spo2?: number;
  vo2_max?: number;

  // Activity
  steps?: number;
  motion?: number;
  active_minutes?: number;

  // Glucose (CGM-only, expected absent on Ring-only)
  glucose?: number;
  avg_glucose?: number;
  glucose_variability?: number;
  metabolic_score?: number;
  hba1c?: number;
  time_in_target?: number;

  // Date echo (the API returns the queried date alongside metrics)
  date?: string;
}

// `fetchRange` returns one entry per day in the requested window.
export type DailyMetricsRange = DailyMetrics[];

// Human-readable list of metrics the user can ask AI tools about.
// Constrained to keyof DailyMetrics so a typo is a compile error.
export type MetricName = keyof Pick<
  DailyMetrics,
  | "sleep_score"
  | "total_sleep"
  | "rem_sleep"
  | "deep_sleep"
  | "light_sleep"
  | "sleep_efficiency"
  | "hrv"
  | "night_rhr"
  | "hr"
  | "recovery_index"
  | "movement_index"
  | "temp"
  | "spo2"
  | "vo2_max"
  | "steps"
  | "active_minutes"
>;

export const METRIC_LABELS: Record<MetricName, string> = {
  sleep_score: "Sleep Score",
  total_sleep: "Total Sleep",
  rem_sleep: "REM Sleep",
  deep_sleep: "Deep Sleep",
  light_sleep: "Light Sleep",
  sleep_efficiency: "Sleep Efficiency",
  hrv: "HRV",
  night_rhr: "Night RHR",
  hr: "Heart Rate",
  recovery_index: "Recovery Index",
  movement_index: "Movement Index",
  temp: "Body Temperature",
  spo2: "SpO₂",
  vo2_max: "VO₂ Max",
  steps: "Steps",
  active_minutes: "Active Minutes",
};
