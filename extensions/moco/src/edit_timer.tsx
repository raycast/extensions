import { Detail, environment } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ActivityTimerEdit } from "./commands/activities/components/ActivityTimerEdit";
import { Activity } from "./commands/activities/types";
import { currentActivity } from "./commands/activities/utils";
import { getTodaysActivities } from "./utils/storage";
import { finishMenuBarForm } from "./utils/refresh";

// Opened from the menu bar with { activity } as context. From Raycast search it edits the running or last timer.
export default function Command() {
  const contextActivity = environment.launchContext?.activity as Activity | undefined;
  const { data: activities, isLoading } = usePromise(getTodaysActivities, [], {
    execute: contextActivity === undefined,
  });
  const activity = contextActivity ?? (activities ? currentActivity(activities) : undefined);

  if (activity === undefined) {
    return <Detail isLoading={isLoading} markdown={isLoading ? "" : "No timer today."} />;
  }
  return <ActivityTimerEdit activity={activity} onSubmitted={finishMenuBarForm} />;
}
