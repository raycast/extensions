import { Action, ActionPanel, Icon, List, confirmAlert, Alert, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Activity, Entry, getEntries, deleteEntry } from "../db";
import { showErrorHUD, formatDuration, refreshMenuBar } from "../utils";
import { EditEntryView } from "./EditEntryView";

interface EntryListViewProps {
  activity: Activity;
}

export function EntryListView({ activity }: EntryListViewProps) {
  const {
    data: entries = [],
    isLoading,
    revalidate,
  } = useCachedPromise(getEntries, [activity.uuid], {
    onError: (error) => showErrorHUD("loading entries", error),
  });

  const handleDelete = async (entry: Entry) => {
    if (
      await confirmAlert({
        title: "Delete entry?",
        message: `Delete ${formatDuration(entry.duration)} from ${entry.date}?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting..." });
      try {
        await deleteEntry(entry.uuid);
        toast.style = Toast.Style.Success;
        toast.title = "Entry deleted";
        refreshMenuBar();
        await revalidate();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        await showErrorHUD("deleting entry", error);
      }
    }
  };

  return (
    <List isLoading={isLoading} navigationTitle={`Entries: ${activity.title}`}>
      {entries.map((entry) => (
        <List.Item
          key={entry.uuid}
          title={formatDuration(entry.duration)}
          subtitle={entry.date}
          icon={Icon.Clock}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit"
                icon={Icon.Pencil}
                target={<EditEntryView entry={entry} onSave={revalidate} />}
              />
              <Action
                title="Delete"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(entry)}
              />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && entries.length === 0 && (
        <List.EmptyView title="No Entries" description="No time entries for this activity" icon={Icon.Clock} />
      )}
    </List>
  );
}
