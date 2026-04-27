import { Color, Icon } from "@raycast/api";

/**
 * Returns the icon and tint for a booking status string returned by Cal.com's API.
 * Status values: "accepted", "rejected", "cancelled", "pending", and any unknown
 * statuses fall through to a neutral purple Circle.
 */
export function iconForBookingStatus(status: string): { source: Icon; tintColor: Color } {
  switch (status) {
    case "accepted":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "rejected":
    case "cancelled":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    case "pending":
      return { source: Icon.Clock, tintColor: Color.Orange };
    default:
      return { source: Icon.Circle, tintColor: Color.Purple };
  }
}
