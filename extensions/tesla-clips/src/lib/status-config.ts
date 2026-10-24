/**
 * Raycast icon and label mapping for event display statuses.
 */

import { Color, Icon } from "@raycast/api";
import { MODERN_COLORS } from "../constants";
import type { EventDisplayStatus } from "../types";

/** Icon tint and list label for a given {@link EventDisplayStatus}. */
type StatusAppearance = {
  readonly icon: { source: Icon; tintColor: Color };
  readonly label: string;
};

const EVENT_STATUS_CONFIG: Record<EventDisplayStatus, StatusAppearance> = {
  pending: { icon: { source: Icon.Circle, tintColor: MODERN_COLORS.neutral }, label: "Ready to merge" },
  existing: { icon: { source: Icon.CheckCircle, tintColor: MODERN_COLORS.success }, label: "Already merged" },
  "existing-partial": {
    icon: { source: Icon.CircleProgress100, tintColor: MODERN_COLORS.warning },
    label: "Partially merged",
  },
  merging: { icon: { source: Icon.CircleProgress25, tintColor: MODERN_COLORS.primary }, label: "Merging" },
  merged: { icon: { source: Icon.CheckCircle, tintColor: MODERN_COLORS.success }, label: "Merged" },
  skipped: { icon: { source: Icon.CheckCircle, tintColor: MODERN_COLORS.neutral }, label: "Already merged" },
  partial: { icon: { source: Icon.ExclamationMark, tintColor: MODERN_COLORS.warning }, label: "Partial" },
  failed: { icon: { source: Icon.XMarkCircle, tintColor: MODERN_COLORS.error }, label: "Failed" },
};

/**
 * Returns list accessory icon and label for an event status.
 *
 * @param status - Computed display status for a Tesla event.
 * @returns Raycast icon configuration and short label text.
 */
export function getStatusAppearance(status: EventDisplayStatus): StatusAppearance {
  return EVENT_STATUS_CONFIG[status];
}
