import { withAccessToken } from "@raycast/utils";
import { googleOAuth } from "./lib/google-oauth";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  PopToRootType,
  Icon,
  LaunchProps,
  LaunchType,
  List,
  closeMainWindow,
  confirmAlert,
  launchCommand,
  open,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import EditEvent from "./edit-event";
import {
  copyEventToCalendar,
  deleteEvent,
  isWritable,
  listCalendars,
  moveEventToCalendar,
} from "./lib/google";
import { conferenceUrl } from "./lib/schedule";
import { GoogleCalendarEntry, GoogleEvent, ScheduleEvent } from "./lib/types";

export type EventActionsLaunchContext = {
  calendar?: GoogleCalendarEntry;
  event?: GoogleEvent;
  action?: "view" | "edit" | "copy" | "move" | "delete";
  hideCopyToCalendar?: boolean;
};

type EventActionsLaunchProps = LaunchProps<{
  launchContext: EventActionsLaunchContext;
}>;

type Props = {
  calendar: GoogleCalendarEntry;
  event: GoogleEvent;
  onChanged?: () => void | Promise<void>;
  hideCopyToCalendar?: boolean;
};

function mapsUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function calendarName(calendar: GoogleCalendarEntry): string {
  const displayName =
    calendar.summaryOverride?.trim() || calendar.summary?.trim() || "";

  if (
    calendar.primary &&
    (!displayName ||
      displayName === calendar.id ||
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(displayName))
  ) {
    return "Personal (Primary)";
  }

  return displayName || "Calendar";
}

function eventTitle(event: GoogleEvent): string {
  return event.summary?.trim() || "Untitled Event";
}

function isAllDayEvent(event: GoogleEvent): boolean {
  return Boolean(event.start.date && !event.start.dateTime);
}

export function isGuestEvent(event: GoogleEvent): boolean {
  if (event.organizer?.self === true || event.creator?.self === true) {
    return false;
  }

  if (event.organizer?.self === false) return true;

  // Older/partial responses can omit organiser.self. A self attendee without
  // any evidence that this account created/organises the event is still an
  // invitation/guest copy.
  return Boolean(event.attendees?.some((attendee) => attendee.self));
}

export function canEditEvent(
  calendar: GoogleCalendarEntry,
  event: GoogleEvent,
): boolean {
  // Attendees can edit their own copy of an invited event on a writable
  // calendar. Those edits do not change the organiser's copy.
  return isWritable(calendar) && event.eventType !== "birthday";
}

export function canModifyEvent(
  calendar: GoogleCalendarEntry,
  event: GoogleEvent,
): boolean {
  if (!canEditEvent(calendar, event)) return false;

  // Moving/deleting is intentionally stricter than editing. Guest copies can
  // be edited locally, but DayCal must not treat the attendee as
  // the organiser of the shared event.
  if (isGuestEvent(event)) return false;

  return true;
}

export function isGmailGeneratedEvent(event: GoogleEvent): boolean {
  if (event.eventType === "fromGmail") return true;

  // A copied Gmail event becomes a normal/default Google Calendar event but can
  // retain the original Gmail boilerplate in its description. If Google has
  // explicitly told us the event type, trust that instead of the description
  // so editable copies are not mistaken for locked Gmail-generated events.
  if (event.eventType) return false;

  // Fallback for older/partial API responses that omit eventType.
  const description = event.description?.toLowerCase() || "";
  return (
    description.includes("event was created from an email") ||
    description.includes("automatically created events")
  );
}

export type CalendarTransferMode = "copy" | "move";

export function transferModeFor(
  calendar: GoogleCalendarEntry,
  event: GoogleEvent,
): CalendarTransferMode | null {
  if (event.eventType === "birthday") return null;

  // Google only supports moving ordinary/default events. Gmail-generated and
  // special/expanded recurring events are safer as copies.
  const ordinaryEvent = !event.eventType || event.eventType === "default";
  if (
    canModifyEvent(calendar, event) &&
    ordinaryEvent &&
    !event.recurringEventId
  ) {
    return "move";
  }

  return "copy";
}

function calendarEventBrowserUrl(event: GoogleEvent): string {
  if (event.htmlLink?.trim()) return event.htmlLink.trim();

  const start = event.start.dateTime
    ? new Date(event.start.dateTime)
    : event.start.date
      ? new Date(`${event.start.date}T00:00:00`)
      : null;

  if (!start) {
    return "https://calendar.google.com/calendar/u/0/r";
  }

  const year = start.getFullYear();
  const month = String(start.getMonth() + 1).padStart(2, "0");
  const day = String(start.getDate()).padStart(2, "0");

  return `https://calendar.google.com/calendar/u/0/r/day/${year}/${month}/${day}`;
}

function formatEventTime(event: GoogleEvent): string {
  if (isAllDayEvent(event)) {
    if (!event.start.date) return "All day";
    const start = new Date(`${event.start.date}T00:00:00`);
    const date = new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(start);
    return `${date} · All day`;
  }

  if (!event.start.dateTime) return "Time unavailable";

  const start = new Date(event.start.dateTime);
  const end = event.end.dateTime ? new Date(event.end.dateTime) : null;

  const date = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(start);

  const clock = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return end
    ? `${date} · ${clock.format(start)}–${clock.format(end)}`
    : `${date} · ${clock.format(start)}`;
}

function eventDetailsText(
  calendar: GoogleCalendarEntry,
  event: GoogleEvent,
  meeting: string | undefined,
): string {
  const lines = [
    eventTitle(event),
    formatEventTime(event),
    `Calendar: ${calendarName(calendar)}`,
  ];

  if (event.location?.trim()) lines.push(`Location: ${event.location.trim()}`);
  if (meeting) lines.push(`Meeting: ${meeting}`);
  if (event.description?.trim()) lines.push("", event.description.trim());

  return lines.join("\n");
}

async function refreshMenuBar(): Promise<void> {
  try {
    await launchCommand({
      name: "menu-bar",
      type: LaunchType.Background,
    });
  } catch {
    // Non-fatal: the menu bar may be disabled.
  }
}

async function confirmAndDelete(
  calendar: GoogleCalendarEntry,
  event: GoogleEvent,
): Promise<boolean> {
  const title = eventTitle(event);
  const confirmed = await confirmAlert({
    title: `Delete “${title}”?`,
    message: event.recurringEventId
      ? "This deletes this occurrence from Google Calendar."
      : "This removes the event from Google Calendar.",
    primaryAction: {
      title: "Delete Event",
      style: Alert.ActionStyle.Destructive,
    },
  });

  if (!confirmed) return false;

  await deleteEvent(calendar.id, event.id);

  // Don't block the delete flow on a menu-bar refresh. The background refresh
  // will also reconcile the cache if this launch is delayed.
  void refreshMenuBar();

  await showHUD("Event deleted");
  return true;
}

export function CalendarTransferView({
  sourceCalendar,
  event,
  mode,
  onTransferred,
}: {
  sourceCalendar: GoogleCalendarEntry;
  event: GoogleEvent;
  mode: CalendarTransferMode;
  onTransferred?: () => void | Promise<void>;
}) {
  const [calendars, setCalendars] = useState<GoogleCalendarEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [workingCalendarId, setWorkingCalendarId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const available = await listCalendars();
        setCalendars(
          available
            .filter(
              (candidate) =>
                candidate.id !== sourceCalendar.id && isWritable(candidate),
            )
            .sort((a, b) => calendarName(a).localeCompare(calendarName(b))),
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : String(loadError),
        );
      } finally {
        setIsLoading(false);
      }
    })();
  }, [sourceCalendar.id]);

  async function transfer(destination: GoogleCalendarEntry) {
    const destinationName = calendarName(destination);
    const sourceName = calendarName(sourceCalendar);

    if (mode === "move") {
      const confirmed = await confirmAlert({
        title: `Move “${eventTitle(event)}”?`,
        message: `Move this event from ${sourceName} to ${destinationName}.`,
        primaryAction: {
          title: `Move to ${destinationName}`,
        },
      });
      if (!confirmed) return;
    }

    try {
      setWorkingCalendarId(destination.id);

      if (mode === "move") {
        await moveEventToCalendar(sourceCalendar.id, destination.id, event.id);
      } else {
        await copyEventToCalendar(destination.id, event);
      }

      void refreshMenuBar();
      await onTransferred?.();
      await showHUD(
        mode === "move"
          ? `Moved to ${destinationName}`
          : `Copied to ${destinationName}`,
      );
    } catch (transferError) {
      await showToast({
        style: Toast.Style.Failure,
        title:
          mode === "move" ? "Could not move event" : "Could not copy event",
        message:
          transferError instanceof Error
            ? transferError.message
            : String(transferError),
      });
      setWorkingCalendarId(null);
    }
  }

  if (error) {
    return (
      <Detail
        navigationTitle={
          mode === "move" ? "Move to Calendar" : "Copy to Calendar"
        }
        markdown={`### Could not load calendars\n\n${error}`}
      />
    );
  }

  return (
    <List
      isLoading={isLoading || Boolean(workingCalendarId)}
      navigationTitle={
        mode === "move" ? "Move to Calendar" : "Copy to Calendar"
      }
      searchBarPlaceholder="Search writable calendars…"
    >
      <List.Section
        title={mode === "move" ? "Move Event" : "Copy Event"}
        subtitle={eventTitle(event)}
      >
        {calendars.map((destination) => (
          <List.Item
            key={destination.id}
            title={calendarName(destination)}
            subtitle={destination.primary ? "Primary · Writable" : "Writable"}
            icon={{
              source: Icon.Calendar,
              tintColor: destination.backgroundColor || Color.PrimaryText,
            }}
            actions={
              <ActionPanel>
                <Action
                  title={`${mode === "move" ? "Move" : "Copy"} to ${calendarName(destination)}`}
                  icon={mode === "move" ? Icon.ArrowRight : Icon.CopyClipboard}
                  onAction={() => transfer(destination)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {!isLoading && calendars.length === 0 ? (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No other writable calendars"
          description="DayCal could not find another calendar you can write to."
        />
      ) : null}
    </List>
  );
}

export function EventActionsView({
  calendar,
  event,
  onChanged,
  hideCopyToCalendar = false,
}: Props) {
  const [deleting, setDeleting] = useState(false);

  const scheduleItem: ScheduleEvent = { calendar, event };
  const meeting = conferenceUrl(scheduleItem);
  const writable = canEditEvent(calendar, event);
  const guest = isGuestEvent(event);
  const modifiable = canModifyEvent(calendar, event);
  const gmailGenerated = isGmailGeneratedEvent(event);
  const editable = writable && !gmailGenerated;
  const transferMode = transferModeFor(calendar, event);
  const timed = Boolean(event.start.dateTime && event.end.dateTime);
  const title = eventTitle(event);
  const location = event.location?.trim() || "";
  const details = eventDetailsText(calendar, event, meeting);

  async function removeEvent() {
    try {
      setDeleting(true);
      const deleted = await confirmAndDelete(calendar, event);
      if (deleted) {
        await onChanged?.();
      } else {
        setDeleting(false);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not delete event",
        message: error instanceof Error ? error.message : String(error),
      });
      setDeleting(false);
    }
  }

  const editTarget = (
    <EditEvent
      calendar={calendar}
      event={event}
      onSaved={async () => {
        void refreshMenuBar();
        await onChanged?.();
      }}
    />
  );

  return (
    <List
      isLoading={deleting}
      navigationTitle={`Event Actions · ${title}`}
      searchBarPlaceholder="Search event actions…"
    >
      <List.Section
        title={title}
        subtitle={`${formatEventTime(event)} · ${calendarName(calendar)}`}
      >
        {editable ? (
          <List.Item
            title="Edit Event"
            subtitle={
              timed
                ? "Edit title, time, location and description in Raycast"
                : "Edit title, dates, location and description in Raycast"
            }
            icon={Icon.Pencil}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Event"
                  icon={Icon.Pencil}
                  target={editTarget}
                />
              </ActionPanel>
            }
          />
        ) : null}

        {transferMode && !(hideCopyToCalendar && transferMode === "copy") ? (
          <List.Item
            title={
              transferMode === "move"
                ? "Move to Calendar…"
                : "Copy to Calendar…"
            }
            subtitle={
              transferMode === "move"
                ? "Move this event to another writable calendar"
                : gmailGenerated
                  ? "Create an editable copy on another calendar — no duplicate guest invites"
                  : "Create a copy on another writable calendar"
            }
            icon={
              transferMode === "move" ? Icon.ArrowRight : Icon.CopyClipboard
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="Choose Destination Calendar"
                  icon={
                    transferMode === "move"
                      ? Icon.ArrowRight
                      : Icon.CopyClipboard
                  }
                  target={
                    <CalendarTransferView
                      sourceCalendar={calendar}
                      event={event}
                      mode={transferMode}
                      onTransferred={onChanged}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        ) : null}

        <List.Item
          title="Open in Google Calendar"
          subtitle={
            event.htmlLink ? "Open the specific event" : "Open the event day"
          }
          icon={Icon.Calendar}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in Google Calendar"
                url={calendarEventBrowserUrl(event)}
                icon={Icon.Calendar}
              />
            </ActionPanel>
          }
        />

        {meeting ? (
          <List.Item
            title="Join Meeting"
            subtitle={meeting}
            icon={Icon.Video}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Join Meeting"
                  url={meeting}
                  icon={Icon.Video}
                />
              </ActionPanel>
            }
          />
        ) : null}

        {location ? (
          <List.Item
            title="Open Location"
            subtitle={location}
            icon={Icon.Map}
            actions={
              <ActionPanel>
                <Action
                  title="Open in Google Maps"
                  icon={Icon.Map}
                  onAction={() => open(mapsUrl(location))}
                />
              </ActionPanel>
            }
          />
        ) : null}
      </List.Section>

      <List.Section title="Copy">
        <List.Item
          title="Copy Event Details"
          subtitle="Title, time, calendar, location and meeting link"
          icon={Icon.Clipboard}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Event Details"
                content={details}
                icon={Icon.Clipboard}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Copy Event Title"
          subtitle={title}
          icon={Icon.Clipboard}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Event Title"
                content={title}
                icon={Icon.Clipboard}
              />
            </ActionPanel>
          }
        />
        {meeting ? (
          <List.Item
            title="Copy Meeting Link"
            subtitle={meeting}
            icon={Icon.Link}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Meeting Link"
                  content={meeting}
                  icon={Icon.Link}
                />
              </ActionPanel>
            }
          />
        ) : null}
        {location ? (
          <List.Item
            title="Copy Location"
            subtitle={location}
            icon={Icon.Clipboard}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Location"
                  content={location}
                  icon={Icon.Clipboard}
                />
              </ActionPanel>
            }
          />
        ) : null}
      </List.Section>

      {modifiable ? (
        <List.Section title="Danger Zone">
          <List.Item
            title="Delete Event"
            subtitle={
              event.recurringEventId
                ? "Delete this occurrence"
                : "Remove this event"
            }
            icon={{ source: Icon.Trash, tintColor: Color.Red }}
            actions={
              <ActionPanel>
                <Action
                  title="Delete Event"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={removeEvent}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : guest && writable ? (
        <List.Section title="Event Access">
          <List.Item
            title="Guest Event"
            subtitle="Edits affect your copy only; the organiser controls the shared event"
            icon={Icon.Person}
          />
        </List.Section>
      ) : (
        <List.Section title="Calendar Access">
          <List.Item
            title="Read-only Event"
            subtitle="This calendar does not allow editing or deleting"
            icon={Icon.Lock}
          />
        </List.Section>
      )}
    </List>
  );
}

export function EventActionsCommandView(props: EventActionsLaunchProps) {
  const calendar = props.launchContext?.calendar;
  const event = props.launchContext?.event;
  const action = props.launchContext?.action ?? "view";

  if (!calendar || !event) {
    return (
      <Detail
        navigationTitle="Event Actions"
        markdown="### No event selected\n\nChoose an upcoming event from the DayCal menu bar."
      />
    );
  }

  if (action === "move") {
    if (transferModeFor(calendar, event) !== "move") {
      return (
        <Detail
          navigationTitle="Move Event"
          markdown="### This event can’t be moved directly\n\nUse **Copy to Calendar…** instead."
        />
      );
    }

    return (
      <CalendarTransferView
        sourceCalendar={calendar}
        event={event}
        mode="move"
      />
    );
  }

  if (action === "copy") {
    return (
      <CalendarTransferView
        sourceCalendar={calendar}
        event={event}
        mode="copy"
      />
    );
  }

  if (action === "edit") {
    if (!canEditEvent(calendar, event) || isGmailGeneratedEvent(event)) {
      return (
        <Detail
          navigationTitle="Edit Event"
          markdown={
            isGmailGeneratedEvent(event)
              ? "### Gmail-generated event\n\nGoogle locks this event because it was created automatically from Gmail. Use **Copy to Calendar…** in Event Actions to make an editable copy."
              : "### Read-only event\n\nThis event does not allow editing."
          }
        />
      );
    }

    return (
      <EditEvent calendar={calendar} event={event} onSaved={refreshMenuBar} />
    );
  }

  if (action === "delete") {
    if (!canModifyEvent(calendar, event)) {
      return (
        <Detail
          navigationTitle="Delete Event"
          markdown="### Guest or read-only event\n\nDayCal will not delete an event organised by someone else. Open it in Google Calendar if you want to change your attendance or remove it from your own calendar."
        />
      );
    }
    return <DeleteEventView calendar={calendar} event={event} />;
  }

  return (
    <EventActionsView
      calendar={calendar}
      event={event}
      hideCopyToCalendar={props.launchContext?.hideCopyToCalendar}
    />
  );
}

function DeleteEventView({ calendar, event }: Props) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        await confirmAndDelete(calendar, event);
        await closeMainWindow({
          clearRootSearch: false,
          popToRootType: PopToRootType.Immediate,
        });
      } catch (error) {
        setError(error instanceof Error ? error.message : String(error));
      }
    })();
  }, [calendar, event]);

  if (error) {
    return (
      <Detail
        navigationTitle="Delete Event"
        markdown={`### Could not delete event\n\n${error}`}
      />
    );
  }

  // A view command is intentionally used here because it keeps a live frontend
  // session for confirmAlert. Keep the host view visually empty; the alert is
  // the only UI the user needs to interact with.
  return <Detail navigationTitle="Delete Event" markdown=" " />;
}

export default withAccessToken(googleOAuth)(EventActionsCommandView);
