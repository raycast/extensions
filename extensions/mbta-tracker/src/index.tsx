import { useState } from "react";
import { Icon, List, ActionPanel, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import type { RoutesResponse, Route } from "./types";

function outputRouteListItem(item: Route) {
  return (
    <List.Item
      key={item.id}
      title={item.attributes.type == "3" ? item.attributes.short_name : item.attributes.long_name}
      icon={{ source: Icon.CircleFilled, tintColor: item.attributes.color }}
      accessoryTitle={item.attributes.description}
    />
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data } = useFetch<RoutesResponse>(`https://api-v3.mbta.com/routes`, {
    keepPreviousData: true,
  });

  return (
    <List isLoading={isLoading} searchText={searchText} throttle>
      <List.Section title="Subway">
        {(data?.data || [])
          .filter((item: Route) => parseInt(item.attributes.type) == 0 || parseInt(item.attributes.type) == 1)
          .map((item) => outputRouteListItem(item))}
      </List.Section>
      <List.Section title="Bus">
        {(data?.data || [])
          .filter((item) => parseInt(item.attributes.type) == 3)
          .map((item) => outputRouteListItem(item))}
      </List.Section>
      <List.Section title="Commuter Rail">
        {(data?.data || [])
          .filter((item) => parseInt(item.attributes.type) == 2)
          .map((item) => outputRouteListItem(item))}
      </List.Section>
    </List>
  );
}
