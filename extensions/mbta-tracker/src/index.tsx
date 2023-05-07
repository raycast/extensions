import { Icon, List, ActionPanel, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { DirectionsList } from "./components/DirectionsList";
import type { RoutesResponse, Route } from "./types";
import { appendApiKey } from "./utils";

function outputRouteListItem(route: Route) {
  return (
    <List.Item
      key={route.id}
      title={route.attributes.type == "3" ? route.attributes.short_name : route.attributes.long_name}
      icon={{ source: Icon.CircleFilled, tintColor: route.attributes.color }}
      accessories={[{ text: route.attributes.description }]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Choose Route"
            icon={Icon.Compass}
            target={<DirectionsList key={route.id} route={route} />}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { isLoading, data } = useFetch<RoutesResponse>(appendApiKey("https://api-v3.mbta.com/routes"), {
    keepPreviousData: true,
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select MBTA route...">
      <List.Section title="Subway">
        {(data?.data || [])
          .filter((route: Route) => parseInt(route.attributes.type) == 0 || parseInt(route.attributes.type) == 1)
          .map((route) => outputRouteListItem(route))}
      </List.Section>
      <List.Section title="Bus">
        {(data?.data || [])
          .filter((route) => parseInt(route.attributes.type) == 3)
          .map((route) => outputRouteListItem(route))}
      </List.Section>
      <List.Section title="Commuter Rail">
        {(data?.data || [])
          .filter((route) => parseInt(route.attributes.type) == 2)
          .map((route) => outputRouteListItem(route))}
      </List.Section>
    </List>
  );
}
