import { applyAvailability, presenceResultMessage } from "../api/presence";

/**
 * Clears the user's manually set Microsoft Teams presence, returning to the
 * automatically calculated presence.
 */
export default async function () {
  // Clear without a HUD; the AI reports the result itself.
  await applyAvailability(undefined);
  return presenceResultMessage(undefined);
}
