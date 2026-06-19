import { Color, getPreferenceValues, Icon } from "@raycast/api";
import { LagStatus } from "./types";

export function getLagThresholds(): { warning: number; critical: number } {
  const prefs = getPreferenceValues<Preferences>();
  return {
    warning: isNaN(parseInt(prefs.lagThresholdWarning, 10)) ? 1000 : parseInt(prefs.lagThresholdWarning, 10),
    critical: isNaN(parseInt(prefs.lagThresholdCritical, 10)) ? 10000 : parseInt(prefs.lagThresholdCritical, 10),
  };
}

export function determineLagStatus(lag: number): LagStatus {
  const { warning, critical } = getLagThresholds();
  if (lag >= critical) return LagStatus.CRITICAL;
  if (lag >= warning) return LagStatus.WARNING;
  return LagStatus.OK;
}

export function lagStatusIcon(status: LagStatus): { source: Icon; tintColor: Color } {
  switch (status) {
    case LagStatus.CRITICAL:
      return { source: Icon.ExclamationMark, tintColor: Color.Red };
    case LagStatus.WARNING:
      return { source: Icon.Warning, tintColor: Color.Orange };
    case LagStatus.OK:
      return { source: Icon.CheckCircle, tintColor: Color.Green };
  }
}

export function statusColor(status: LagStatus): Color {
  switch (status) {
    case LagStatus.CRITICAL:
      return Color.Red;
    case LagStatus.WARNING:
      return Color.Orange;
    case LagStatus.OK:
      return Color.Green;
  }
}

export function formatLag(lag: number): string {
  return lag.toLocaleString("en-US");
}
