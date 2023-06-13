import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { eventActive, eventFinished } from "../helpers/date";
import { parseTime } from "../helpers/time";
import { Attendee } from "../types/attendee";
import { CalendarEvent } from "../types/event";
import { logOut } from "../oauth/google";

type EventListItemProps = {
  event: CalendarEvent;
};

export default function EventListItem({ event }: EventListItemProps) {
  const startDate = new Date(event.start?.dateTime).toTimeString();
  const endDate = new Date(event.end?.dateTime).toTimeString();

  const isAttending = (attendees: Attendee[]): boolean => {
    let responseStatus = "";

    attendees.forEach((attendee: Attendee) => {
      if (attendee.self) {
        if (attendee.responseStatus) {
          responseStatus = attendee.responseStatus;
        }
      }
    });
    return responseStatus == "accepted";
  };

  const eventListItemIcon = (event: CalendarEvent) => {
    if (eventFinished(event.end.dateTime)) return { source: Icon.Check, tintColor: "#000000" };
    if (eventActive(event.start.dateTime, event.end.dateTime))
      return { source: Icon.CircleProgress, tintColor: Color.Green };
    return { source: Icon.Calendar, tintColor: isAttending(event.attendees) ? Color.Blue : "#000000" };
  };

  const meetingLinkIcon = (event: CalendarEvent): string => {
    if (event.hangoutLink) {
      return event.hangoutLink;
    }
    if (event.location) {
      return event.location;
    }
    return Icon.Circle;
  };

  return (
    <List.Item
      key={event.id}
      icon={eventListItemIcon(event)}
      title={event.summary || "Untitled"}
      accessories={[
        { text: `${parseTime("start", startDate)} - ${parseTime("end", endDate)}` || "unknown" },
        { icon: getFavicon(meetingLinkIcon(event)) },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={event.hangoutLink || event.location || "https://calendar.google.com/calendar/u/1/r"}
          />
          <Action title="Log Out" onAction={() => logOut()} />
        </ActionPanel>
      }
    />
  );
}
