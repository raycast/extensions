import { clearStatus } from "../api/status";

/**
 * Clears the signed-in user's Microsoft Teams status message.
 */
export default async function () {
  await clearStatus();
  return "Cleared status";
}
