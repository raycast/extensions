import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { PlaceEventsResponse } from "./types";
import { formatEventTime, getEventLocation, API_URLS, getEventUrl } from "./utils";
import EventDetail from "./event-detail";

interface EventsListProps {
  slug: string;
  placeName: string;
}

export default function EventsList({ slug, placeName }: EventsListProps) {
  const { isLoading, data, error } = useFetch<PlaceEventsResponse>(API_URLS.PLACE_URL(slug));

  const events = data?.data?.events || [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search events..." navigationTitle={placeName}>
      {error && (
        <List.EmptyView icon={Icon.ExclamationMark} title="Failed to load events" description={error.message} />
      )}

      {events.length === 0 && !isLoading && !error && (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No upcoming events"
          description={`There are no upcoming events in ${placeName}`}
        />
      )}

      {events.map((entry) => (
        <List.Item
          key={entry.api_id}
          icon={{ source: entry.event.cover_url }}
          title={entry.event.name}
          subtitle={formatEventTime(entry.event.start_at, entry.event.timezone)}
          accessories={[{ text: getEventLocation(entry), icon: Icon.Pin }]}
          actions={
            <ActionPanel>
              <Action.Push title="View Details" icon={Icon.Eye} target={<EventDetail entry={entry} />} />
              <Action.OpenInBrowser title="Open in Browser" url={getEventUrl(entry)} />
              <Action.CopyToClipboard
                title="Copy Event Link"
                content={getEventUrl(entry)}
                shortcut={{ macOS: { modifiers: ["cmd"], key: "c" }, Windows: { modifiers: ["ctrl"], key: "c" } }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
