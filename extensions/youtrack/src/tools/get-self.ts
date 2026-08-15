import { handleOnCatchError } from "../api/errors-helper";
import { YouTrackApi } from "../api/youtrack-api";
import { loadCache, saveCache } from "../cache";
import type { User } from "../interfaces";

/**
 * Reads self user from the cache, or fetches them from YouTrack if not present.
 */
export default async function getSelf() {
  const api = YouTrackApi.getInstance();
  try {
    const [user] = await loadCache<User>("youtrack-self-user");
    if (!user) {
      const currentUser = await api.fetchSelf();
      await saveCache("youtrack-self-user", [currentUser]);
      return currentUser;
      await saveCache("youtrack-self-user", [user]);
    }
    return user;
  } catch (error) {
    handleOnCatchError(error, "Error fetching user");
  }
}
