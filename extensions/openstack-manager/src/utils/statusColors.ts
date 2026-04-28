/**
 * Status-to-color mapping for OpenStack resources.
 *
 * Each function maps a resource status string to a Raycast `Color` value.
 * Unknown or unrecognised statuses always map to `Color.SecondaryText` (gray).
 */

import { Color } from "@raycast/api";

/**
 * Returns a color for a Nova server status.
 *
 * - Green: ACTIVE
 * - Red: ERROR
 * - Orange: BUILD, SHUTOFF, REBOOT, HARD_REBOOT
 * - Gray: anything else
 */
export function getServerStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case "ACTIVE":
      return Color.Green;
    case "ERROR":
      return Color.Red;
    case "BUILD":
    case "SHUTOFF":
    case "REBOOT":
    case "HARD_REBOOT":
      return Color.Orange;
    default:
      return Color.SecondaryText;
  }
}

/**
 * Returns a color for a Glance image status.
 *
 * - Green: active
 * - Red: killed, deactivated
 * - Orange: queued, saving
 * - Gray: anything else
 */
export function getImageStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "active":
      return Color.Green;
    case "killed":
    case "deactivated":
      return Color.Red;
    case "queued":
    case "saving":
      return Color.Orange;
    default:
      return Color.SecondaryText;
  }
}

/**
 * Returns a color for a Magnum cluster status.
 *
 * - Green: CREATE_COMPLETE, UPDATE_COMPLETE
 * - Red: CREATE_FAILED, DELETE_FAILED
 * - Orange: any status ending with _IN_PROGRESS
 * - Gray: anything else
 */
export function getClusterStatusColor(status: string): string {
  const upper = status.toUpperCase();

  switch (upper) {
    case "CREATE_COMPLETE":
    case "UPDATE_COMPLETE":
      return Color.Green;
    case "CREATE_FAILED":
    case "DELETE_FAILED":
      return Color.Red;
    default:
      if (upper.endsWith("_IN_PROGRESS")) {
        return Color.Orange;
      }
      return Color.SecondaryText;
  }
}
