import { Color, Icon, LaunchProps, List } from "@raycast/api";
import { useEvents, withGoogleAPIs } from "./lib/google";
import { calendar_v3 } from "@googleapis/calendar";
import { formatRecurrence } from "./lib/utils";
import useCalendars from "./hooks/useCalendars";
import { useState, useMemo } from "react";
import EventActions from "./components/EventActions";
import CalendarSelector from "./components/CalendarSelector";

function getAccessories(event: calendar_v3.Schema$Event) {
  const accessories = new Array<List.Item.Accessory>();

  if (event.recurrence || event.recurringEventId) {
    const accessory: List.Item.Accessory = {
      icon: Icon.Repeat,
      tooltip: event.recurrence ? formatRecurrence(event.recurrence) : undefined,
    };
    accessories.push(accessory);
  }

  if (event.conferenceData) {
    accessories.push({
      icon: event.conferenceData.conferenceSolution?.iconUri ?? Icon.Video,
      tooltip: `Conference: ${event.conferenceData.conferenceSolution?.name}`,
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

function Command(props: LaunchProps) {
  const { calendarId } = (props.launchContext ?? {}) as { calendarId?: string };
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(calendarId ?? null);
  const { data, isLoading, pagination, revalidate } = useEvents(selectedCalendarId);
  const { data: calendars, isLoading: calendarsIsLoading, revalidate: revalidateCalendars } = useCalendars();

  const selectedCalendar = useMemo(() => {
    const allCalendars = [...(calendars?.selected ?? []), ...(calendars?.unselected ?? [])];
    const primaryCalendar = allCalendars.find((calendar) => calendar.primary);
    const selected =
      selectedCalendarId && selectedCalendarId !== "primary"
        ? allCalendars.find((calendar) => calendar.id === selectedCalendarId)
        : primaryCalendar;
    return selected ?? null;
  }, [calendars, selectedCalendarId]);

  const sections =
    data?.reduce(
      (acc, event) => {
        const date = new Date(event.start?.dateTime ?? event.start?.date ?? "");
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeekStart = new Date(now);
        nextWeekStart.setDate(now.getDate() + 2); // Start after tomorrow
        const nextWeekEnd = new Date(now);
        nextWeekEnd.setDate(now.getDate() + 7);

        let section;

        if (
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth() &&
          date.getDate() === now.getDate()
        ) {
          section = "Today";
        } else if (
          date.getFullYear() === tomorrow.getFullYear() &&
          date.getMonth() === tomorrow.getMonth() &&
          date.getDate() === tomorrow.getDate()
        ) {
          section = "Tomorrow";
        } else if (date >= nextWeekStart && date <= nextWeekEnd) {
          section = "Next Week";
        } else if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
          section = `Rest of ${date.toLocaleString("default", { month: "long" })}`;
        } else {
          // Group by month name
          section = date.toLocaleString("default", { month: "long" });
        }

        if (!acc[section]) {
          acc[section] = [];
        }
        acc[section].push(event);
        return acc;
      },
      {} as Record<string, calendar_v3.Schema$Event[]>,
    ) ?? {};

  // Sort sections by date
  const sectionOrder = Object.keys(sections).sort((a, b) => {
    if (a === "Today") return -1;
    if (b === "Today") return 1;
    if (a === "Tomorrow") return -1;
    if (b === "Tomorrow") return 1;

    // Compare month/year sections
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateA.getTime() - dateB.getTime();
  });

  const formatEventTime = (event: calendar_v3.Schema$Event, section: string) => {
    const startDate = new Date(event.start?.dateTime ?? event.start?.date ?? "");
    const endDate = new Date(event.end?.dateTime ?? event.end?.date ?? "");

    // For Today or Tomorrow, show only time
    if (section === "Today" || section === "Tomorrow") {
      // Check if it's an all-day event
      if (event.start?.date) {
        return "All day";
      } else {
        return `${startDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} - ${endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      }
    }

    // For month sections, show weekday and date
    return startDate.toLocaleDateString(undefined, { weekday: "long", day: "numeric" });
  };

  return (
    <List
      isLoading={isLoading || calendarsIsLoading}
      pagination={pagination}
      searchBarAccessory={
        <CalendarSelector
          calendars={calendars ?? []}
          onCalendarChange={setSelectedCalendarId}
          storeValue={typeof calendarId === "undefined"}
          defaultValue={calendarId}
        />
      }
    >
      {sectionOrder.map((section) => {
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
                accessories={getAccessories(event)}
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
      })}
    </List>
  );
}

export default withGoogleAPIs(Command);
