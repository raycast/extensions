import { Action, ActionPanel, launchCommand, LaunchType, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect } from "react";
import { useWeekOverview } from "./hooks";
import { dayjs, formatDuration } from "./lib";

export default function Command() {
  const { error, data } = useWeekOverview();

  useEffect(() => {
    if (error) {
      void showFailureToast(error, { title: "Failed to fetch entries" });
    }
  }, [error]);

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
                onAction={async () => {
                  try {
                    await launchCommand({
                      name: "open-my-timetable",
                      type: LaunchType.UserInitiated,
                    });
                  } catch (e) {
                    await showFailureToast(e, { title: "Failed to open timetable" });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView title="No Entries This Week" description="No tracked time found for the current week." />
    </List>
  );
}
