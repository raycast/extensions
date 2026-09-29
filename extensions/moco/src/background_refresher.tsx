import { removeLegacyStatusKeys, storeProjects, storeTodaysActivities, storeUser } from "./utils/storage";
import { fetchProjects } from "./commands/projects/api";
import { fetchUser } from "./commands/user/api";
import { fetchActivities } from "./commands/activities/api";

// Runs every 30s (package.json interval) and fills the cache that the menu bar reads.
export default async function Command() {
  await Promise.all([
    fetchUser().then(async (user) => {
      await storeUser(user);
      // Only the current user's activities. Without user_id MOCO returns the activities of all users.
      await storeTodaysActivities(await fetchActivities(null, 0, user.id));
    }),
    // Projects include their tasks, so no extra request per project is needed.
    fetchProjects().then((projects) => storeProjects(projects)),
    // One-time cleanup of the old "<projectId>" keys. No-op after the first run.
    removeLegacyStatusKeys(),
  ]).catch((error) => {
    console.error("Error refreshing the MOCO cache", error);
  });
}
