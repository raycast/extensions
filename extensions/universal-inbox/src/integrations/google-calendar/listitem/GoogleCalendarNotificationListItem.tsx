import { GoogleCalendarEventPreview } from "../preview/GoogleCalendarEventPreview";
import { GoogleCalendarEvent, getEventStartDisplay, getMeetLink } from "../types";
import { NotificationActions } from "../../../action/NotificationActions";
import { NotificationListItemProps } from "../../../notification";
import { Icon, Color, List } from "@raycast/api";

export function GoogleCalendarNotificationListItem({ notification, mutate }: NotificationListItemProps) {
  if (notification.source_item.data.type !== "GoogleCalendarEvent") return null;

  const event: GoogleCalendarEvent = notification.source_item.data.content;
  const subtitle = getEventStartDisplay(event);
  const meetLink = getMeetLink(event);

  const accessories: List.Item.Accessory[] = [
    {
      date: new Date(notification.updated_at),
      tooltip: `Updated at ${notification.updated_at}`,
    },
  ];

  if (event.attendees.length > 0) {
    accessories.unshift({
      text: `${event.attendees.length}`,
      icon: Icon.Person,
      tooltip: `${event.attendees.length} attendee(s)`,
    });
  }

  if (meetLink) {
    accessories.unshift({
      icon: { source: Icon.Video, tintColor: Color.Green },
      tooltip: "Google Meet link available",
    });
  }

  if (event.status === "cancelled") {
    accessories.unshift({
      icon: { source: Icon.XMarkCircle, tintColor: Color.Red },
      tooltip: "Cancelled",
    });
  }

  return (
    <List.Item
      key={notification.id}
      title={notification.title}
      icon={Icon.Calendar}
      subtitle={subtitle}
      accessories={accessories}
      actions={
        <NotificationActions
          notification={notification}
          detailsTarget={<GoogleCalendarEventPreview notification={notification} event={event} />}
          mutate={mutate}
        />
      }
    />
  );
}
