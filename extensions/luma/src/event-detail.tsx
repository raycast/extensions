import { ActionPanel, Action, Detail, Icon, Color } from "@raycast/api";
import { EventEntry } from "./types";
import { formatEventTime, getEventLocation, getTicketStatus } from "./utils";

export default function EventDetail({ entry }: { entry: EventEntry }) {
  const ticketStatus = getTicketStatus(entry);
  const eventUrl = `https://luma.com/${entry.event.url}`;
  const organizerUrl = `https://luma.com/${entry.calendar.slug}`;

  const markdown = `
# ${entry.event.name}
![${entry.event.name}](${entry.event.cover_url})
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={entry.event.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Date & Time"
            text={formatEventTime(entry.event.start_at, entry.event.timezone)}
            icon={Icon.Calendar}
          />
          <Detail.Metadata.Label title="Location" text={getEventLocation(entry)} icon={Icon.Pin} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Organizer"
            text={entry.calendar.name}
            icon={{ source: entry.calendar.avatar_url }}
          />
          {entry.hosts.length > 0 && (
            <Detail.Metadata.Label title="Host" text={entry.hosts.map((h) => h.name).join(", ")} icon={Icon.Person} />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={ticketStatus.text} color={ticketStatus.color} />
            {entry.guest_count > 0 && (
              <Detail.Metadata.TagList.Item text={`${entry.guest_count} attending`} color={Color.SecondaryText} />
            )}
          </Detail.Metadata.TagList>
          {entry.ticket_info.spots_remaining !== null && (
            <Detail.Metadata.Label
              title="Spots Remaining"
              text={`${entry.ticket_info.spots_remaining}`}
              icon={Icon.TwoPeople}
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Event Page" url={eventUrl} />
          <Action.OpenInBrowser
            title="Open Organizer Page"
            url={organizerUrl}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "o" }, Windows: { modifiers: ["ctrl"], key: "o" } }}
          />
          <Action.CopyToClipboard
            title="Copy Event Link"
            content={eventUrl}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "c" }, Windows: { modifiers: ["ctrl"], key: "c" } }}
          />
          <Action.CopyToClipboard
            title="Copy Event Name"
            content={entry.event.name}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "c" },
              Windows: { modifiers: ["ctrl", "shift"], key: "c" },
            }}
          />
        </ActionPanel>
      }
    />
  );
}
