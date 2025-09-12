/**
 * Utility functions for validating user input
 */

import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

/**
 * Validates that a diaper entry has at least wet or solid
 */
export function isValidDiaperType(wet: boolean, solid: boolean): boolean {
  return wet || solid;
}

/**
 * Validates diaper form data and shows a toast if invalid
 * @returns boolean indicating if the data is valid
 */
export function validateDiaperForm(isWet: boolean, isSolid: boolean): boolean {
  // Validate that at least one of wet or solid is selected
  if (!isValidDiaperType(isWet, isSolid)) {
    showFailureToast({
      title: "Invalid diaper change",
      message: "At least one of Wet or Solid must be selected",
    });
    return false;
  }
  return true;
}

/**
 * Shows a toast for invalid time range error
 */
export function showInvalidTimeRangeError(): void {
  showToast({
    style: Toast.Style.Failure,
    title: "Invalid time range",
    message: "End time must be after start time",
  });
}
