import { useMemo } from "react";
import { Action, ActionPanel, List, useNavigation, Icon } from "@raycast/api";
import { getAvatarIcon, useCachedPromise } from "@raycast/utils";

import ActivityDetail from "./activity-detail";
import { ActivityActions } from "./components/activity";
import { useDebouncedState } from "./hooks";
import { ActivityService } from "./services";
import { distinctBy, groupBy } from "./utils";

export default function ActivityList() {
  const { push } = useNavigation();

  const [, debouncedSearchValue, setSearchValue] = useDebouncedState("");

  const { data: activities, isLoading: isLoadingActivities } = useCachedPromise(ActivityService.getActivities, [
    { search: debouncedSearchValue },
  ]);

  const uniqueActivities = useMemo(() => distinctBy(activities || [], (x) => x.email), [activities]);

  return (
    <List isLoading={isLoadingActivities} onSearchTextChange={setSearchValue}>
      {uniqueActivities?.map((activity, index) => (
        <List.Item
          key={index}
          icon={getAvatarIcon(activity.name)}
          title={activity.name}
          subtitle={activity.company}
          accessories={[{ tag: activity.email }]}
          actions={
            <ActionPanel title={activity.name}>
              <Action
                title="Show Details"
                icon={Icon.Info}
                onAction={() => {
                  const groupedActivities = groupBy(activities || [], (x) => x.email);
                  push(<ActivityDetail activities={groupedActivities[activity.email]} />);
                }}
              />

              <ActivityActions activity={activity} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
