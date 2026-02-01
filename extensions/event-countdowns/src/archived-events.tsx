import { List, ActionPanel, Action, Icon, confirmAlert, Alert } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEvents } from "./hooks/useEvents";
import { formatDate, getRepeatLabel } from "./utils/date-utils";
import { Event } from "./utils/types";

export default function ArchivedEventsList() {
  const { archivedEvents, isLoading, deleteEvent } = useEvents();

  const handleDelete = async (event: Event) => {
    const confirmed = await confirmAlert({
      title: "Delete Event Permanently",
      message: `Are you sure you want to permanently delete "${event.title}"? This cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await deleteEvent(event.id);
      } catch (error) {
        await showFailureToast(error);
      }
    }
  };

  // Sort by baseDate (newest first)
  const sortedEvents = [...archivedEvents].sort((a, b) => {
    return new Date(b.baseDate).getTime() - new Date(a.baseDate).getTime();
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search archived events..." navigationTitle="Archived Events">
      {sortedEvents.length === 0 ? (
        <List.EmptyView
          icon={Icon.Tray}
          title="No Archived Events"
          description="Past one-time events will appear here."
        />
      ) : (
        sortedEvents.map((event) => (
          <List.Item
            key={event.id}
            title={event.title}
            subtitle={formatDate(event.baseDate)}
            accessories={[
              {
                tag: getRepeatLabel(event.repeat),
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Delete Permanently"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => handleDelete(event)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
