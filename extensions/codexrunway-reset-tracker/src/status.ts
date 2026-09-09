import { Color, Icon } from "@raycast/api";
import { ResetRecord, resetTodayAt } from "./api";

/** Native icon + tint for a record's state, replacing emoji with Raycast's own color language. */
export function statusIcon(record: ResetRecord): {
  icon: Icon;
  tintColor: Color;
} {
  if (
    record.kind === "reset_completed" ||
    record.scheduleState === "fulfilled"
  ) {
    return { icon: Icon.CheckCircle, tintColor: Color.Green };
  }
  if (record.kind === "reset_scheduled") {
    return { icon: Icon.Clock, tintColor: Color.Yellow };
  }
  return { icon: Icon.Circle, tintColor: Color.SecondaryText };
}

/** Traffic-light color for the API's confidence score, so low-confidence records stand out. */
export function confidenceColor(confidence?: number | null): Color {
  if (confidence == null) return Color.SecondaryText;
  if (confidence >= 0.9) return Color.Green;
  if (confidence >= 0.7) return Color.Yellow;
  return Color.Red;
}

/**
 * "Did a reset happen today?" — the newest record overall may be a fresh schedule that hides
 * an earlier completion, so scan the whole (newest-first) page rather than just its head.
 * Returns the timestamp of that reset (for relative-time display), or null.
 */
export function resetTodayIn(records: ResetRecord[]): {
  resetToday: boolean;
  at: string | null;
} {
  const at = records.map(resetTodayAt).find((t) => t != null) ?? null;
  return { resetToday: at !== null, at };
}
