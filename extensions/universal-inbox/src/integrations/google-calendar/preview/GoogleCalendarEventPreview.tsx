import { GoogleCalendarEvent, getEventStartDisplay, getMeetLink } from "../types";
import { getNotificationHtmlUrl, Notification } from "../../../notification";
import { getThirdPartyItemSourceLabel } from "../../../third_party_item";
import { Detail, ActionPanel, Action, Color } from "@raycast/api";
import { formatDateTime } from "../../../utils";
import { useMemo } from "react";

interface GoogleCalendarEventPreviewProps {
  notification: Notification;
  event: GoogleCalendarEvent;
}

export function GoogleCalendarEventPreview({ notification, event }: GoogleCalendarEventPreviewProps) {
  const notificationHtmlUrl = useMemo(() => getNotificationHtmlUrl(notification), [notification]);
  const meetLink = getMeetLink(event);

  const endDisplay = event.end.dateTime ? formatDateTime(event.end.dateTime) : (event.end.date ?? "");

  const attendeeLines = event.attendees
    .map((a) => {
      const name = a.displayName ?? a.email;
      const status = a.responseStatus === "accepted" ? "✓" : a.responseStatus === "declined" ? "✗" : "?";
      return `- ${status} ${name}`;
    })
    .join("\n");

  const markdown = [
    `# ${event.summary}`,
    event.description ? `\n${event.description}` : null,
    attendeeLines ? `\n## Attendees\n\n${attendeeLines}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const statusColor =
    event.status === "cancelled" ? Color.Red : event.status === "tentative" ? Color.Yellow : Color.Green;

  const metadata = (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Type" text={getThirdPartyItemSourceLabel(notification.source_item)} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.TagList title="Status">
        <Detail.Metadata.TagList.Item text={event.status} color={statusColor} />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Label title="Start" text={getEventStartDisplay(event)} />
      <Detail.Metadata.Label title="End" text={endDisplay} />
      {event.location ? <Detail.Metadata.Label title="Location" text={event.location} /> : null}
      {meetLink ? <Detail.Metadata.Link title="Meet" target={meetLink} text="Join" /> : null}
      <Detail.Metadata.Label title="Attendees" text={`${event.attendees.length}`} />
    </Detail.Metadata>
  );

  const actions = [<Action.OpenInBrowser key="open" url={notificationHtmlUrl} />];
  if (meetLink) {
    actions.push(<Action.OpenInBrowser key="meet" title="Join Meeting" url={meetLink} />);
  }

  return <Detail markdown={markdown} metadata={metadata} actions={<ActionPanel>{actions}</ActionPanel>} />;
}
