import { getStatus } from "../api/status";

/**
 * Gets the signed-in user's current Microsoft Teams status message, including
 * its optional expiry and when it was published.
 */
export default async function () {
  return await getStatus();
}
