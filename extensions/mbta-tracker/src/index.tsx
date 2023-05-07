import { getPreferenceValues, Icon, List, ActionPanel, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { DirectionsList } from "./components/DirectionsList";
import type { Preferences, RoutesResponse, Route } from "./types";

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
            title="Choose Travel Direction"
            icon={Icon.Compass}
            target={<DirectionsList key={route.id} route={route} />}
          />
          {/* <Action.Push title="Show Stops" icon={Icon.Map} target={<StopsList key={route.id} route={route} />} /> */}
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const url = new URL("https://api-v3.mbta.com/routes");
  const params = new URLSearchParams(url.search);

  if (preferences.apiKey !== undefined && preferences.apiKey !== "") {
    params.append("api_key", preferences.apiKey);
  }

  const { isLoading, data } = useFetch<RoutesResponse>(`${url.href}?${params.toString()}`, {
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
