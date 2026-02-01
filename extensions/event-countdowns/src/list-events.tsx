import { List, ActionPanel, Action, Icon, Color, confirmAlert, Alert } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEvents } from "./hooks/useEvents";
import { getNextOccurrence, getDaysRemaining, getRepeatLabel, formatDate } from "./utils/date-utils";
import { Event } from "./utils/types";
import AddEventForm from "./add-event";
import EditEventForm from "./edit-event";
import ArchivedEventsList from "./archived-events";

export default function ListEvents() {
  const { activeEvents, isLoading, archiveEvent, deleteEvent } = useEvents();

  // Sort by days remaining (ascending)
  const sortedEvents = [...activeEvents].sort((a, b) => {
    const daysA = getDaysRemaining(getNextOccurrence(a.baseDate, a.repeat));
    const daysB = getDaysRemaining(getNextOccurrence(b.baseDate, b.repeat));
    return daysA - daysB;
  });

  const handleArchive = async (event: Event) => {
    try {
      await archiveEvent(event.id);
    } catch (error) {
      await showFailureToast(error);
    }
  };

  const handleDelete = async (event: Event) => {
    const confirmed = await confirmAlert({
      title: "Delete Event",
      message: `Are you sure you want to delete "${event.title}"?`,
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

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search events...">
      {sortedEvents.length === 0 ? (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No Events"
          description="Add your first event to start counting down!"
          actions={
            <ActionPanel>
              <Action.Push title="Add Event" icon={Icon.Plus} target={<AddEventForm />} />
            </ActionPanel>
          }
        />
      ) : (
        sortedEvents.map((event) => {
          const nextOccurrence = getNextOccurrence(event.baseDate, event.repeat);
          const daysRemaining = getDaysRemaining(nextOccurrence);

          return (
            <List.Item
              key={event.id}
              title={event.title}
              subtitle={formatDate(nextOccurrence)}
              accessories={[
                {
                  tag: {
                    value: getRepeatLabel(event.repeat),
                    color: event.repeat === "none" ? Color.SecondaryText : Color.Blue,
                  },
                },
                {
                  text: daysRemaining === 0 ? "Today!" : `${daysRemaining} days`,
                  icon: daysRemaining === 0 ? Icon.Star : Icon.Clock,
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push title="Edit Event" icon={Icon.Pencil} target={<EditEventForm eventId={event.id} />} />
                    <Action.Push
                      title="Add Event"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      target={<AddEventForm />}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Archive Event"
                      icon={Icon.Tray}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                      onAction={() => handleArchive(event)}
                    />
                    <Action.Push
                      title="View Archived Events"
                      icon={Icon.List}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                      target={<ArchivedEventsList />}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Delete Event"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={() => handleDelete(event)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
