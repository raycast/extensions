import { List, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchColors, fetchTodayEvents } from "./calendarApi";
import { logoutAndClearToken } from "./oauth";

export interface CalendarColors {
  event: { [key: string]: { background: string; foreground: string } };
  calendar: { [key: string]: { background: string; foreground: string } };
}

export interface CalendarEvent {
  id: string;
  start: { dateTime: string };
  end: { dateTime: string };
  summary: string;
  description?: string;
  location?: string;
  attendees?: Array<{ email: string; responseStatus: string }>;
  htmlLink?: string;
  colorId?: string;
}

export default function ViewTodayEvents() {
  const [colors, setColors] = useState<CalendarColors>({ event: {}, calendar: {} });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAndSetColorsAndEvents() {
      setLoading(true);
      try {
        const colorsResponse = await fetchColors();
        setColors(colorsResponse);
        const eventsResponse = await fetchTodayEvents();
        setEvents(eventsResponse || []);
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed to load data", error instanceof Error ? error.message : String(error));
      } finally {
        setLoading(false);
      }
    }

    fetchAndSetColorsAndEvents();
  }, []);

  const formatLocation = (location: string | undefined): string => {
    if (!location) {
      return "";
    }

    const matchName = location.match(/^(.*?),/);
    if (matchName && matchName[1].trim()) {
      return matchName[1].trim();
    }

    const matchAddress = location.match(/(\w+\s*\d+),/);
    if (matchAddress && matchAddress[1].trim()) {
      return matchAddress[1].trim();
    }

    return location;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <List isLoading={loading}>
      {events
        .sort((a, b) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime())
        .map((event) => {
          const eventColor = event.colorId
            ? colors.event[event.colorId]?.background
            : colors.calendar["primary"]?.background || "#f6c026"; // Fallback to a specified yellow if no color found for primary calendar

          return (
            <List.Item
              key={event.id}
              icon={{ source: Icon.CircleFilled, tintColor: eventColor || "#000000" }} // Fallback to black if no color found
              title={`${formatTime(event.start.dateTime)} - ${formatTime(event.end.dateTime)}: ${event.summary}`}
              accessories={[...(event.location ? [{ icon: Icon.Pin, text: formatLocation(event.location) }] : [])]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open in Google Calendar" url={event.htmlLink || "#"} />
                  <Action title="Log Out" icon={Icon.Person} onAction={logoutAndClearToken} />
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  markdown={`
---
${event.description || ""}
**Location**: ${event.location ? formatLocation(event.location) : "No location"} 
**Attendees**: ${event.attendees?.map((a) => a.email).join(", ") || ""}
[View Event](${event.htmlLink})
---
`}
                />
              }
            />
          );
        })}
    </List>
  );
}
