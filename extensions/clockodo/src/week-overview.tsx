import {
  Action,
  ActionPanel,
  launchCommand,
  LaunchType,
  List,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useWeekOverview } from "./hooks";
import { dayjs, formatDuration } from "./lib";

export default function Command() {
  const { error, data } = useWeekOverview();

  if (error) {
    showFailureToast(error, { title: "Failed to fetch entries" });
  }

  return (
    <List isLoading={data === undefined}>
      {data?.groups.map((group) => (
        <List.Item
          key={group.name}
          title={dayjs(group.name).format("dddd, MMMM D")}
          accessories={[{ text: formatDuration(group.duration) }]}
          actions={
            <ActionPanel>
              <Action
                title="Open My Timetable"
                onAction={() =>
                  launchCommand({
                    name: "open-my-timetable",
                    type: LaunchType.UserInitiated,
                  })
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
