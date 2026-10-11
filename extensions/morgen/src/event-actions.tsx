import { ActionPanel, Action, Icon } from "@raycast/api";
import { EventWithCalendar, getConferenceUrl, getLocation } from "./utils";

export function EventActions({ event }: { event: EventWithCalendar }) {
  const conferenceUrl = getConferenceUrl(event);
  const location = getLocation(event);

  return (
    <ActionPanel>
      <Action.Open
        title="Open in Morgen"
        icon={Icon.Calendar}
        target="morgen://"
      />
      {conferenceUrl && (
        <Action.OpenInBrowser
          title="Join Meeting"
          icon={Icon.Video}
          url={conferenceUrl}
        />
      )}
      {location && (
        <Action.OpenInBrowser
          title="Search Location"
          url={`https://maps.google.com/maps?q=${encodeURIComponent(location)}`}
          icon={Icon.Pin}
        />
      )}
      <Action.OpenInBrowser
        title="Open in Browser"
        url="https://platform.morgen.so"
      />
      <Action.CopyToClipboard title="Copy Event Title" content={event.title} />
      {location && (
        <Action.CopyToClipboard
          title="Copy Location"
          content={location}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        />
      )}
      {conferenceUrl && (
        <Action.CopyToClipboard
          title="Copy Meeting Link"
          content={conferenceUrl}
          shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
        />
      )}
    </ActionPanel>
  );
}
