import { closeMainWindow, launchCommand, LaunchType, popToRoot } from "@raycast/api";
import { fetchActivities } from "../commands/activities/api";
import { Activity } from "../commands/activities/types";
import { fetchUser } from "../commands/user/api";
import { getUser, storeTodaysActivities } from "./storage";

// Loads today's activities of the current user from the API and writes them to the cache.
export const refreshTodaysActivities = async (): Promise<Activity[]> => {
  const user = (await getUser()) ?? (await fetchUser());
  const activities = await fetchActivities(null, 0, user.id);
  await storeTodaysActivities(activities);
  return activities;
};

// Used by the forms that the menu bar opens: update the cache, re-render the menu bar, close the window.
export const finishMenuBarForm = async (): Promise<void> => {
  await refreshTodaysActivities();
  // Fails when the menu bar command is not enabled. The menu bar then updates on its next run.
  await launchCommand({ name: "moco_menu_bar", type: LaunchType.Background }).catch(() => undefined);
  await closeMainWindow({ clearRootSearch: true });
  await popToRoot();
};
