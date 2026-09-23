import { getPreferenceValues } from "@raycast/api";

/** Sample count used when the preference is missing or unreadable. */
export const DEFAULT_PLOT_POINTS = 1000;
/** Hard ceiling so a corrupted preference can't freeze the command. */
const MAX_PLOT_POINTS = 12_000;

/**
 * Points sampled per plot, from the "Plot Detail" preference. The value is
 * validated here rather than trusted, since it ends up sizing arrays and the
 * embedded SVG.
 */
export function getPlotPoints(): number {
  const { plotDetail } = getPreferenceValues<Preferences>();
  const n = Number(plotDetail);
  if (!Number.isInteger(n) || n < 100) return DEFAULT_PLOT_POINTS;
  return Math.min(n, MAX_PLOT_POINTS);
}
