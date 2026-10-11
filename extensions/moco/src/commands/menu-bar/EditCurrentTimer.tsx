import { Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ActivityTimerEdit } from "../activities/components/ActivityTimerEdit";
import { Activity } from "../activities/types";
import { currentActivity } from "../activities/utils";
import { finishMenuBarForm, refreshTodaysActivities } from "../../utils/refresh";

// Edits the given activity, or else the running or last timer of today.
export const EditCurrentTimer = ({ activity: contextActivity }: { activity?: Activity }) => {
  // From the API, not the cache: the menu bar may be disabled or not refreshed yet.
  const {
    data: activities,
    isLoading,
    error,
  } = usePromise(refreshTodaysActivities, [], {
    execute: contextActivity === undefined,
  });
  const activity = contextActivity ?? (activities ? currentActivity(activities) : undefined);

  if (activity === undefined) {
    const message = error ? `Could not load today's activities: ${error.message}` : "No timer today.";
    return <Detail isLoading={isLoading} markdown={isLoading ? "" : message} />;
  }
  return <ActivityTimerEdit activity={activity} onSubmitted={finishMenuBarForm} />;
};
