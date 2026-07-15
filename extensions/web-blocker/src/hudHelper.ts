/**
 * HUD Helper
 * Provides a wrapper for showHUD with longer display time
 */

import { showHUD } from "@raycast/api";

/**
 * Shows a HUD message that stays visible longer for better readability
 * @param message The message to display
 * @param durationMs Duration in milliseconds (default 3000ms / 3 seconds)
 */
export async function showLongHUD(
  message: string,
  durationMs: number = 3000,
): Promise<void> {
  await showHUD(message);
  // Keep the message visible by delaying the next action
  await new Promise((resolve) => setTimeout(resolve, durationMs));
}
