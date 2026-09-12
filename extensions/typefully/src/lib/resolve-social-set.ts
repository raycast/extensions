import { LocalStorage } from "@raycast/api";
import { listSocialSets } from "./api";
import { DEFAULT_SOCIAL_SET_STORAGE_KEY } from "./constants";

/** Resolve an explicit social set or the user's saved default. Never silently pick among multiple accounts. */
export async function resolveSocialSetId(explicitId?: number): Promise<number> {
  if (explicitId) {
    return explicitId;
  }

  const stored = await LocalStorage.getItem<string>(DEFAULT_SOCIAL_SET_STORAGE_KEY);
  if (stored) {
    return Number(stored);
  }

  const socialSets = await listSocialSets();
  if (socialSets.length === 1) {
    return socialSets[0].id;
  }
  if (socialSets.length === 0) {
    throw new Error("No social sets found. Connect an account in Typefully first.");
  }

  throw new Error(
    "Multiple social sets are available and no default is configured. Use List Social Sets, then pass social_set_id or set a default with Set Default Social Set.",
  );
}
