import { Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ActivityTimerEdit } from "../activities/components/ActivityTimerEdit";
import { Activity } from "../activities/types";
import { currentActivity } from "../activities/utils";
import { getTodaysActivities } from "../../utils/storage";
import { finishMenuBarForm } from "../../utils/refresh";

// Edits the given activity, or else the running or last timer of today.
export const EditCurrentTimer = ({ activity: contextActivity }: { activity?: Activity }) => {
  const { data: activities, isLoading } = usePromise(getTodaysActivities, [], {
    execute: contextActivity === undefined,
  });
  const activity = contextActivity ?? (activities ? currentActivity(activities) : undefined);

  if (activity === undefined) {
    return <Detail isLoading={isLoading} markdown={isLoading ? "" : "No timer today."} />;
  }
  return <ActivityTimerEdit activity={activity} onSubmitted={finishMenuBarForm} />;
};
