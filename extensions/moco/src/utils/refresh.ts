import { closeMainWindow, launchCommand, LaunchType, popToRoot } from "@raycast/api";
import { fetchActivities } from "../commands/activities/api";
import { Activity } from "../commands/activities/types";
import { fetchUser } from "../commands/user/api";
import { User } from "../commands/user/types";
import { fetchProjects } from "../commands/projects/api";
import { Project } from "../commands/projects/types";
import { getUser, removeLegacyStatusKeys, storeProjects, storeTodaysActivities, storeUser } from "./storage";

// The user only changes with the account in the preferences, so the cached user is reused until then.
export const getCurrentUser = async (): Promise<User> => {
  const cached = await getUser();
  if (cached !== undefined) {
    return cached;
  }
  const user = await fetchUser();
  await storeUser(user);
  return user;
};

// Loads today's activities of the current user from the API and writes them to the cache.
export const refreshTodaysActivities = async (): Promise<Activity[]> => {
  const user = await getCurrentUser();
  const activities = await fetchActivities(null, 0, user.id);
  await storeTodaysActivities(activities);
  return activities;
};

// Loads today's activities and assigned projects from the API and writes them to the cache.
// The menu bar calls it on its background runs, so the cache is at most one interval old.
export const refreshCache = async (): Promise<{ activities: Activity[]; projects: Project[] }> => {
  const [activities, projects] = await Promise.all([
    getCurrentUser().then(async (user) => {
      // Only the current user's activities. Without user_id MOCO returns the activities of all users.
      const activities = await fetchActivities(null, 0, user.id);
      await storeTodaysActivities(activities);
      return activities;
    }),
    // Projects include their tasks, so no extra request per project is needed.
    fetchProjects().then(async (projects) => {
      await storeProjects(projects);
      return projects;
    }),
    // One-time cleanup of the old "<projectId>" keys. No-op after the first run.
    removeLegacyStatusKeys(),
  ]);
  return { activities, projects };
};

// Used by the forms that the menu bar opens: update the cache, re-render the menu bar, close the window.
export const finishMenuBarForm = async (): Promise<void> => {
  await refreshTodaysActivities();
  // Fails when the menu bar command is not enabled. The menu bar then updates on its next run.
  await launchCommand({ name: "moco_menu_bar", type: LaunchType.Background }).catch(() => undefined);
  await closeMainWindow({ clearRootSearch: true });
  await popToRoot();
};
