import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { AhotuAPI } from "./api";
import type { EventSearchResult } from "./types";

export default function SearchEvents() {
  const [searchText, setSearchText] = useState("");
  const api = new AhotuAPI();

  const { isLoading, data: events } = usePromise(
    async (query: string) => {
      if (!query || query.trim().length === 0) {
        return [];
      }

      try {
        const results = await api.searchEvents({
          term: query,
          include_editions: false,
        });
        return results;
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Search Failed",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
        return [];
      }
    },
    [searchText],
    {
      execute: searchText.trim().length > 0,
    }
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search events... (try: marathon country:USA @2024 -virtual)"
      throttle
    >
      {!searchText || searchText.trim().length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search for Events"
          description="Start typing to search for sports events. You can use filters like country:USA, @2024, -virtual"
        />
      ) : events && events.length === 0 ? (
        <List.EmptyView icon={Icon.XMarkCircle} title="No Events Found" description="Try a different search term" />
      ) : (
        events?.map((event) => <EventListItem key={event.value} event={event} api={api} />)
      )}
    </List>
  );
}

function EventListItem({ event, api }: { event: EventSearchResult; api: AhotuAPI }) {
  // Format location string
  const location = [event.city, event.region, event.country].filter(Boolean).join(", ");

  // Format date
  const dateStr = event.date ? new Date(event.date).toLocaleDateString() : "Date TBA";

  // Determine status color and icon
  const getStatusAccessory = () => {
    const isClient = event.ro_is_client || event.ahotu_is_client;

    if (isClient) {
      return { tag: { value: "Client", color: Color.Green }, icon: Icon.CheckCircle };
    }

    switch (event.status) {
      case "ok":
        return { tag: { value: "Active", color: Color.Green } };
      case "archived":
        return { tag: { value: "Archived", color: Color.SecondaryText } };
      case "deleted":
        return { tag: { value: "Deleted", color: Color.Red } };
      case "duplicate":
        return { tag: { value: "Duplicate", color: Color.Orange } };
      default:
        return { tag: { value: event.status, color: Color.SecondaryText } };
    }
  };

  const statusAccessory = getStatusAccessory();

  return (
    <List.Item
      title={event.label}
      subtitle={location || "Location TBA"}
      accessories={[{ text: dateStr }, statusAccessory]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open Event Page" url={api.getEventUrl(event)} icon={Icon.Globe} />
            <Action.OpenInBrowser title="Open in Admin" url={api.getAdminUrl(event)} icon={Icon.Gear} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Event Id"
              content={event.value.toString()}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
            />
            <Action.CopyToClipboard
              title="Copy Event Name"
              content={event.label}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action.CopyToClipboard
              title="Copy Event URL"
              content={api.getEventUrl(event)}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
