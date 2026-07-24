import { Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { HubListItem } from "./components/hub-ui";
import { hubSearchURL, type HubListResponse, type HubSort } from "./lib/hub-api";

export default function Command() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<HubSort>("relevance");

  const { data, isLoading } = useFetch<HubListResponse>(hubSearchURL({ q: query, sort, limit: 30 }), {
    keepPreviousData: true,
  });

  const items = data?.data ?? [];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search the SnipperApp Hub…"
      onSearchTextChange={setQuery}
      throttle
      filtering={false}
      searchBarAccessory={
        <List.Dropdown tooltip="Sort" value={sort} onChange={(value) => setSort(value as HubSort)} storeValue>
          <List.Dropdown.Item title="Relevance" value="relevance" />
          <List.Dropdown.Item title="Most Popular" value="popular" />
          <List.Dropdown.Item title="Most Recent" value="recent" />
          <List.Dropdown.Item title="Most Imported" value="imports" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Globe}
        title={query ? "No results" : "Search community snippets"}
        description="Find snippets shared by the community and add them to your library."
      />
      {items.map((snippet) => (
        <HubListItem key={snippet.id} snippet={snippet} />
      ))}
    </List>
  );
}
