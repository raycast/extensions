import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ActivityListItem } from "./ActivityListItem";
import { fetchUser } from "../../user/api";
import { fetchActivities } from "../api";
import { Activity } from "../types";
import { ActivityStart } from "./ActivityStart";

export enum Actions {
  update,
  delete,
}

// Loads the activities of the current user: today, or the last 7 days when filtered by project.
const loadActivities = async (projectID: number | null, lookbackDays: number): Promise<Activity[]> => {
  const user = await fetchUser();
  return fetchActivities(projectID, lookbackDays, user.id);
};

export const ActivityList = ({ projectID = null }: { projectID?: number | null }) => {
  const lookbackDays = projectID ? 7 : 0;
  // Activities come from the cache first, then from the API.
  const {
    data: activities = [],
    isLoading,
    mutate,
  } = useCachedPromise(loadActivities, [projectID, lookbackDays], { keepPreviousData: true });

  // Called after an activity was changed or deleted through the API: show the change at once, then reload.
  function modifyActivity(index: number, newValue: Activity, action: Actions): void {
    mutate(Promise.resolve(), {
      optimisticUpdate: (current) => {
        const updated = [...(current ?? [])];
        if (action === Actions.update) {
          updated[index] = newValue;
        } else {
          updated.splice(index, 1);
        }
        return updated;
      },
    });
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter tasks by name..."
      isShowingDetail={true}
      actions={
        <ActionPanel>
          <Action.Push title="New Activity" target={<ActivityStart projectID={projectID} />} />
        </ActionPanel>
      }
    >
      {activities.map((activity, index) => (
        <ActivityListItem key={index} index={index} activity={activity} modifyActivity={modifyActivity} />
      ))}
      <List.Item
        title="New Activity"
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <Action.Push title="New Activity" target={<ActivityStart />} />
          </ActionPanel>
        }
      />
    </List>
  );
};
