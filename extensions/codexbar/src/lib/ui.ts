import { Color, Icon, Image, getPreferenceValues } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { PercentMode, Severity, clampPercent, severity, shownPercent } from "./format";

export function percentMode(): PercentMode {
  return getPreferenceValues<Preferences>().percentMode === "used" ? "used" : "remaining";
}

const SEVERITY_COLORS: Record<Severity, Color> = {
  ok: Color.Green,
  warning: Color.Yellow,
  critical: Color.Orange,
  exhausted: Color.Red,
};

export function severityColor(usedPercent: number): Color {
  return SEVERITY_COLORS[severity(usedPercent)];
}

/** Ring that fills with whatever the user chose to display (remaining or used). */
export function limitIcon(usedPercent: number, mode: PercentMode): Image.ImageLike {
  if (clampPercent(usedPercent) >= 100) return { source: Icon.XMarkCircle, tintColor: Color.Red };
  return getProgressIcon(shownPercent(usedPercent, mode) / 100, severityColor(usedPercent));
}
