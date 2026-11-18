import { getPreferenceValues } from "@raycast/api";
import type { Units } from "./types";

export function preferences() {
  const values = getPreferenceValues<Preferences>();
  const threshold = Number(values.menuBarThreshold);
  const units: Units = values.units === "bits" ? "bits" : "bytes";
  return {
    units,
    animateCharts: values.animateCharts,
    hideSystemDaemons: values.hideSystemDaemons,
    showUpload: values.showUpload,
    thresholdBytes: Number.isFinite(threshold) && threshold >= 0 ? threshold * 1000 : 500_000,
  };
}
