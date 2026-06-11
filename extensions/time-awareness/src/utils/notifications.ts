import { open, showHUD } from "@raycast/api";
import { getParsedPreferences } from "./preferences";
import { getConfettiEnabled } from "./storage";

/**
 * Triggers a notification when an active interval is completed.
 * Shows a HUD message and optionally launches confetti animation.
 *
 * @param minutes - The number of minutes completed
 */
export async function triggerIntervalCompleteNotification(minutes: number): Promise<void> {
  const enableConfetti = await getConfettiEnabled();
  const { confettiEmojis } = getParsedPreferences();
  try {
    await showHUD(`🩷 You have been active for ${minutes} minutes`);
    if (enableConfetti) {
      await open(`raycast://extensions/raycast/raycast/confetti?emojis=${encodeURIComponent(confettiEmojis)}`);
    }
  } catch (error) {
    console.error("Failed to trigger notification:", error);
  }
}
