import { Icon, Color } from "@raycast/api";
import { MetricName } from "./types";
import { Status, statusColor } from "./insights";

// ---------------------------------------------------------------------------
// Metric → Icon map
// ---------------------------------------------------------------------------
// Icon names verified against @raycast/api types/index.d.ts Icon enum.
// Substitutions made where no exact semantic match existed:
//   - spo2:    Icon.Waveform   (no Lung icon; Waveform is used for pulse/vitals)
//   - temp:    Icon.Temperature (verified — exists as "temperature-16")
//   - vo2_max: Icon.Gauge       (aerobic capacity / performance metric)

export const METRIC_ICON: Record<MetricName, Icon> = {
  sleep_score: Icon.Moon,
  total_sleep: Icon.Moon,
  rem_sleep: Icon.Moon,
  deep_sleep: Icon.Moon,
  light_sleep: Icon.Moon,
  sleep_efficiency: Icon.Moon,
  hrv: Icon.Heartbeat,
  hr: Icon.Heartbeat,
  night_rhr: Icon.Heartbeat,
  recovery_index: Icon.Bolt,
  movement_index: Icon.Footprints,
  temp: Icon.Temperature,
  spo2: Icon.Waveform,
  vo2_max: Icon.Gauge,
  steps: Icon.Footprints,
  active_minutes: Icon.Stopwatch,
};

// ---------------------------------------------------------------------------
// Status-aware icon factory
// ---------------------------------------------------------------------------

/**
 * Returns a Raycast icon spec with the icon appropriate for the metric
 * tinted to the color that matches the insight status.
 */
export function metricIcon(metric: MetricName, status: Status): { source: Icon; tintColor: Color } {
  return {
    source: METRIC_ICON[metric] ?? Icon.Circle,
    tintColor: statusColor(status),
  };
}
