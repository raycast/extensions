import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  Form,
  Icon,
  List,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { eventStartDate, formatEventTime } from "./lib/dates";
import {
  deleteEvent,
  invalidateCache,
  listCalendars,
  listEvents,
  updateEvent,
} from "./lib/morgen";
import { showFailure, showSuccess } from "./lib/ui";
import type { Calendar, Event } from "./types";

function escapeMarkdown(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\\", "\\\\")
    .replaceAll("*", "\\*")
    .replaceAll("_", "\\_")
    .replaceAll("`", "\\`")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]")
    .replaceAll("#", "\\#");
}

function EventDetails({
  event,
  calendar,
}: {
  event: Event;
  calendar?: Calendar;
}) {
  const name =
    calendar?.["morgen.so:metadata"]?.overrideName ||
    calendar?.name ||
    "Calendar";
  return (
    <Detail
      markdown={`# ${escapeMarkdown(event.title)}\n\n${escapeMarkdown(event.description || "No description")}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="When" text={formatEventTime(event)} />
          <Detail.Metadata.Label title="Duration" text={event.duration} />
          <Detail.Metadata.Label title="Calendar" text={name} />
        </Detail.Metadata>
      }
    />
  );
}

function EditEvent({ event, onSaved }: { event: Event; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const { pop } = useNavigation();

  async function submit(values: { title: string; description: string }) {
    if (!values.title.trim()) {
      await showFailure(new Error("Enter an event title."));
      return;
    }
    setSaving(true);
    try {
      await updateEvent(event, {
        title: values.title.trim(),
        description: values.description.trim(),
      });
      await showSuccess("Event updated");
      onSaved();
      pop();
    } catch (error) {
      await showFailure(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Form
      isLoading={saving}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Event"
            icon={Icon.SaveDocument}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" defaultValue={event.title} />
      <Form.TextArea
        id="description"
        title="Description"
        defaultValue={event.description || ""}
      />
      <Form.Description text="Edits apply to this event or this recurring occurrence." />
    </Form>
  );
}

export default function Events() {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(14);

  const load = useCallback(
    async (force = false) => {
      setLoading(true);
      try {
        if (force) invalidateCache();
        const available = (await listCalendars()).filter(
          (calendar) => calendar.myRights?.mayReadItems !== false,
        );
        setCalendars(available);
        if (available.length === 0) {
          setEvents([]);
          return;
        }
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + days);
        const fetched = await listEvents(available, start, end);
        setEvents(
          fetched.filter((event) => !event["morgen.so:metadata"]?.taskId),
        );
      } catch (error) {
        await showFailure(error);
      } finally {
        setLoading(false);
      }
    },
    [days],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = useMemo(
    () =>
      [...events].sort(
        (a, b) => eventStartDate(a).getTime() - eventStartDate(b).getTime(),
      ),
    [events],
  );

  async function remove(event: Event) {
    const confirmed = await confirmAlert({
      title: `Delete “${event.title}”?`,
      message: event.masterEventId
        ? "Only this occurrence will be deleted."
        : "This event will be removed from its connected calendar.",
      primaryAction: {
        title: "Delete Event",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    try {
      await deleteEvent(event);
      await showSuccess("Event deleted");
      await load(true);
    } catch (error) {
      await showFailure(error);
    }
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search upcoming events"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Time Range"
          value={String(days)}
          onChange={(value) => setDays(Number(value))}
        >
          <List.Dropdown.Item value="7" title="Next 7 Days" />
          <List.Dropdown.Item value="14" title="Next 14 Days" />
          <List.Dropdown.Item value="30" title="Next 30 Days" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title="No Upcoming Events"
        description="Check your connected calendars or choose a longer time range."
      />
      {sorted.map((event) => {
        const calendar = calendars.find((item) => item.id === event.calendarId);
        return (
          <List.Item
            key={`${event.accountId}:${event.id}`}
            title={event.title}
            subtitle={
              calendar?.["morgen.so:metadata"]?.overrideName || calendar?.name
            }
            accessories={[{ text: formatEventTime(event) }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Event"
                  icon={Icon.Eye}
                  target={<EventDetails event={event} calendar={calendar} />}
                />
                <Action.Push
                  title="Edit Event"
                  icon={Icon.Pencil}
                  target={
                    <EditEvent event={event} onSaved={() => void load(true)} />
                  }
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={() => void load(true)}
                />
                <Action
                  title="Delete Event"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => void remove(event)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
