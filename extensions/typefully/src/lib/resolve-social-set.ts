import { LocalStorage } from "@raycast/api";
import { listSocialSets } from "./api";
import { DEFAULT_SOCIAL_SET_STORAGE_KEY, LAST_SOCIAL_SET_STORAGE_KEY } from "./constants";

/**
 * Resolve the social set ID to use for API calls.
 * Priority: stored default → last used → only available social set → error.
 */
export async function resolveSocialSetId(): Promise<number> {
  const stored = await LocalStorage.getItem<string>(DEFAULT_SOCIAL_SET_STORAGE_KEY);
  if (stored) {
    return Number(stored);
  }

  const lastUsed = await LocalStorage.getItem<string>(LAST_SOCIAL_SET_STORAGE_KEY);
  if (lastUsed) {
    return Number(lastUsed);
  }

  const socialSets = await listSocialSets();
  if (socialSets.length === 1) {
    return socialSets[0].id;
  }

  if (socialSets.length === 0) {
    throw new Error("No social sets found. Please set up a social set in Typefully first.");
  }

  // Multiple social sets available — fall back to the first one
  return socialSets[0].id;
}
