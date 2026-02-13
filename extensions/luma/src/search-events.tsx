import { useState } from "react";
import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { SearchEventsResponse } from "./types";
import { formatEventTime, getEventLocation } from "./utils";
import EventDetail from "./event-detail";

export default function SearchEvents() {
  const [searchText, setSearchText] = useState<string>("");

  const { isLoading, data, error } = useFetch<SearchEventsResponse>(
    `https://api2.luma.com/discover/get-paginated-events?query=${encodeURIComponent(searchText)}`,
    {
      execute: searchText.length > 0,
    },
  );

  const events = data?.entries || [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search events..." onSearchTextChange={setSearchText} throttle>
      {error && (
        <List.EmptyView icon={Icon.ExclamationMark} title="Failed to search events" description={error.message} />
      )}

      {searchText.length === 0 && (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Search for Events" description="Type a keyword to search" />
      )}

      {searchText.length > 0 && events.length === 0 && !isLoading && !error && (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No events found"
          description={`No events found for "${searchText}"`}
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
              <Action.OpenInBrowser title="Open in Browser" url={`https://luma.com/${entry.event.url}`} />
              <Action.CopyToClipboard
                title="Copy Event Link"
                content={`https://luma.com/${entry.event.url}`}
                shortcut={{ macOS: { modifiers: ["cmd"], key: "c" }, Windows: { modifiers: ["ctrl"], key: "c" } }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
