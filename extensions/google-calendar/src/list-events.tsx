import { Action, ActionPanel, Color, getPreferenceValues, Icon, LaunchProps, List } from "@raycast/api";
import { useEvents, withGoogleAPIs } from "./lib/google";
import { calendar_v3 } from "@googleapis/calendar";
import { formatRecurrence } from "./lib/utils";
import useCalendars from "./hooks/useCalendars";
import { useCallback, useEffect, useMemo, useState } from "react";
import EventActions from "./components/EventActions";
import CalendarSelector from "./components/CalendarSelector";
import { isBirthdaysView, resolvePickerCalendarId } from "./lib/event-types";

function getAccessories(event: calendar_v3.Schema$Event, showLocation: boolean) {
  const accessories = new Array<List.Item.Accessory>();

  if (showLocation && event.location) {
    accessories.push({
      text: event.location,
      icon: Icon.Pin,
      tooltip: `Location: ${event.location}`,
    });
  }

  if (event.recurrence || event.recurringEventId) {
    const accessory: List.Item.Accessory = {
      icon: Icon.Repeat,
      tooltip: event.recurrence ? formatRecurrence(event.recurrence) : undefined,
    };
    accessories.push(accessory);
  }

  if (event.conferenceData) {
    const solution = event.conferenceData.conferenceSolution;
    accessories.push({
      icon:
        solution?.key?.type === "hangoutsMeet" || solution?.name === "Google Meet"
          ? "meet.png"
          : (solution?.iconUri ?? Icon.Video),
      tooltip: `Conference: ${solution?.name}`,
    });
  }

  if (event.attendees) {
    const accessory: List.Item.Accessory = {
      text: `${event.attendees.length}`,
      icon: Icon.Person,
      tooltip: event.attendees.map((attendee) => `${attendee.email} (${attendee.responseStatus})`).join("\n"),
    };
    accessories.push(accessory);
  }

  return accessories;
}

function getStatusColor(event: calendar_v3.Schema$Event) {
  const status = event.attendees?.find((attendee) => attendee.self)?.responseStatus;
  switch (status) {
    case "accepted":
      return Color.Green;
    case "tentative":
      return Color.Yellow;
    case "declined":
      return Color.Red;
    default:
      return Color.SecondaryText;
  }
}

function getStatusIcon(event: calendar_v3.Schema$Event) {
  const status = event.attendees?.find((attendee) => attendee.self)?.responseStatus;
  switch (status) {
    case "accepted":
      return Icon.CheckCircle;
    case "tentative":
      return Icon.CircleDisabled;
    case "declined":
      return Icon.XMarkCircle;
    default:
      return Icon.QuestionMarkCircle;
  }
}

function getStatusTooltip(event: calendar_v3.Schema$Event) {
  const status = event.attendees?.find((attendee) => attendee.self)?.responseStatus;
  return `Status: ${status ?? "-"}`;
}

function getIcon(event: calendar_v3.Schema$Event) {
  return {
    value: { source: getStatusIcon(event), tintColor: getStatusColor(event) },
    tooltip: getStatusTooltip(event),
  };
}

export function getEventSection(date: Date, now = new Date()) {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const startOfNextWeek = new Date(now);
  const daysUntilNextMonday = (8 - now.getDay()) % 7 || 7;
  startOfNextWeek.setDate(now.getDate() + daysUntilNextMonday);
  startOfNextWeek.setHours(0, 0, 0, 0);
  const endOfNextWeek = new Date(startOfNextWeek);
  endOfNextWeek.setDate(startOfNextWeek.getDate() + 7);

  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  ) {
    return "Today";
  } else if (
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate()
  ) {
    return "Tomorrow";
  } else if (date >= startOfNextWeek && date < endOfNextWeek) {
    return "Next Week";
  } else if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
    return `Rest of ${date.toLocaleString("default", { month: "long" })}`;
  } else if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleString("default", { month: "long" });
  } else {
    return date.toLocaleString("default", { month: "long", year: "numeric" });
  }
}

function Command(props: LaunchProps) {
  const { calendarId } = (props.launchContext ?? {}) as { calendarId?: string };
  const { showLocation } = getPreferenceValues<Preferences.ListEvents>();
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(
    resolvePickerCalendarId(calendarId) ?? null,
  );
  const [isMounted, setIsMounted] = useState(false);
  const { data, isLoading, error: eventsError, pagination, revalidate } = useEvents(selectedCalendarId);
  const {
    data: calendars,
    isLoading: calendarsIsLoading,
    error: calendarsError,
    revalidate: revalidateCalendars,
  } = useCalendars();

  // Cached Promise hooks return data and pagination before the native List mounts; populating the List too
  // early can report selection state while the React fiber has no alternate and trigger an invalid state update.
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleCalendarChange = useCallback((newValue: string) => {
    setSelectedCalendarId(newValue);
  }, []);

  const isDropdownReady = isMounted && !calendarsIsLoading;

  const selectedCalendar = useMemo(() => {
    const allCalendars = [...(calendars?.selected ?? []), ...(calendars?.unselected ?? [])];
    const primaryCalendar = allCalendars.find((calendar) => calendar.primary);
    if (isBirthdaysView(selectedCalendarId)) {
      return primaryCalendar ?? { id: "primary" };
    }
    const selected =
      selectedCalendarId && selectedCalendarId !== "primary"
        ? allCalendars.find((calendar) => calendar.id === selectedCalendarId)
        : primaryCalendar;
    return selected ?? null;
  }, [calendars, selectedCalendarId]);

  const sections =
    data?.reduce(
      (acc, event) => {
        const date = new Date(event.start?.dateTime ?? (event.start?.date ? `${event.start.date}T00:00:00` : ""));
        const now = new Date();
        const section = getEventSection(date, now);

        if (!acc[section]) {
          acc[section] = [];
        }
        acc[section].push(event);
        return acc;
      },
      {} as Record<string, calendar_v3.Schema$Event[]>,
    ) ?? {};

  const getSectionTime = (section: string) => {
    const firstEvent = sections[section]?.[0];
    const dateStr =
      firstEvent?.start?.dateTime ?? (firstEvent?.start?.date ? `${firstEvent.start.date}T00:00:00` : undefined);
    return dateStr ? new Date(dateStr).getTime() : 0;
  };

  const sectionOrder = Object.keys(sections).sort((a, b) => {
    if (a === "Today") return -1;
    if (b === "Today") return 1;
    if (a === "Tomorrow") return -1;
    if (b === "Tomorrow") return 1;
    if (a === "Next Week") return -1;
    if (b === "Next Week") return 1;

    return getSectionTime(a) - getSectionTime(b);
  });
  const loadError = eventsError ?? calendarsError;

  const formatEventTime = (event: calendar_v3.Schema$Event, section: string) => {
    const startDate = new Date(event.start?.dateTime ?? (event.start?.date ? `${event.start.date}T00:00:00` : ""));
    const endDate = new Date(event.end?.dateTime ?? (event.end?.date ? `${event.end.date}T00:00:00` : ""));

    if (section === "Today" || section === "Tomorrow") {
      if (event.start?.date) {
        return "All day";
      } else {
        return `${startDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} - ${endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      }
    }

    return startDate.toLocaleDateString(undefined, { weekday: "long", day: "numeric" });
  };

  return (
    <List
      isLoading={isLoading || calendarsIsLoading}
      pagination={isMounted ? pagination : undefined}
      searchBarPlaceholder="Search events…"
      searchBarAccessory={
        isDropdownReady ? (
          <CalendarSelector
            calendars={calendars}
            onCalendarChange={handleCalendarChange}
            storeValue={typeof calendarId === "undefined"}
            defaultValue={resolvePickerCalendarId(calendarId)}
          />
        ) : undefined
      }
    >
      {isMounted && !isLoading && !calendarsIsLoading && sectionOrder.length === 0 && loadError && (
        <List.EmptyView
          title="Couldn't Load Events"
          description={loadError.message || "Check your connection and try again."}
          icon={Icon.XMarkCircle}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={() => {
                  revalidate();
                  revalidateCalendars();
                }}
              />
            </ActionPanel>
          }
        />
      )}
      {isMounted && !isLoading && !calendarsIsLoading && sectionOrder.length === 0 && !loadError && (
        <List.EmptyView
          title="No Events"
          description="No upcoming events found in this calendar."
          icon={Icon.Calendar}
        />
      )}
      {isMounted
        ? sectionOrder.map((section) => {
            const events = sections[section];
            if (!events?.length) return null;

            return (
              <List.Section key={section} title={section}>
                {events.map((event) => (
                  <List.Item
                    key={event.id}
                    icon={getIcon(event)}
                    title={event.summary ?? "Untitled Event"}
                    subtitle={formatEventTime(event, section)}
                    accessories={getAccessories(event, showLocation)}
                    actions={
                      <EventActions
                        event={event}
                        calendar={selectedCalendar}
                        revalidate={() => {
                          revalidate();
                          revalidateCalendars();
                        }}
                      />
                    }
                  />
                ))}
              </List.Section>
            );
          })
        : null}
    </List>
  );
}

export default withGoogleAPIs(Command);
