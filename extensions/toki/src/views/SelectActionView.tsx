import { Action, ActionPanel, Icon, List, showToast, Toast, closeMainWindow, showHUD } from "@raycast/api";
import { Group, Activity, startTracking } from "../db";
import { showErrorHUD, refreshMenuBar } from "../utils";
import { AdjustStartTimeView } from "./AdjustStartTimeView";
import { AddTimeEntryView } from "./AddTimeEntryView";
import { EntryListView } from "./EntryListView";

interface SelectActionViewProps {
  group: Group;
  activity: Activity;
}

export function SelectActionView({ group, activity }: SelectActionViewProps) {
  const handleStartTracking = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Starting..." });

    try {
      await startTracking(group.uuid, activity.uuid);
      refreshMenuBar();
      closeMainWindow();
      await showHUD(`Started: ${activity.title}`);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to start";
      await showErrorHUD("starting tracking", error);
    }
  };

  return (
    <List navigationTitle={activity.title}>
      <List.Item
        title="Start Tracking"
        subtitle="Begin tracking time now"
        icon={Icon.Play}
        actions={
          <ActionPanel>
            <Action title="Start Tracking" icon={Icon.Play} onAction={handleStartTracking} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Start & Adjust Time"
        subtitle="Start tracking and adjust the start time"
        icon={Icon.Clock}
        actions={
          <ActionPanel>
            <Action.Push
              title="Start & Adjust Time"
              icon={Icon.Clock}
              target={<AdjustStartTimeView group={group} activity={activity} />}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Add Time Entry"
        subtitle="Log time without live tracking"
        icon={Icon.PlusCircle}
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Time Entry"
              icon={Icon.PlusCircle}
              target={<AddTimeEntryView group={group} activity={activity} />}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="View Entries"
        subtitle="View, edit, or delete time entries"
        icon={Icon.List}
        actions={
          <ActionPanel>
            <Action.Push title="View Entries" icon={Icon.List} target={<EntryListView activity={activity} />} />
          </ActionPanel>
        }
      />
    </List>
  );
}
