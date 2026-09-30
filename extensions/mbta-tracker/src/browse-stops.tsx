import { Icon, List, ActionPanel, Action } from "@raycast/api";
import { useFetch, useFrecencySorting } from "@raycast/utils";
import { DirectionsList } from "./components/DirectionsList";
import type { RoutesResponse, Route } from "./types";
import { appendApiKey } from "./utils";
import { useState } from "react";

function outputRouteListItem(route: Route, visitItem: any, resetRanking: any) {
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
            onPush={() => visitItem(route)}
          />
          <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={() => resetRanking(route)} />
        </ActionPanel>
      }
    />
  );
}
type RouteType = { id: string; name: string };

function RouteDropdown(props: { routeTypes: RouteType[]; onRouteTypeChange: (newValue: string) => void }) {
  const { routeTypes, onRouteTypeChange } = props;
  return (
    <List.Dropdown
      tooltip="Select transportation type"
      storeValue={false}
      onChange={(newValue) => {
        onRouteTypeChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Transportation Type">
        {routeTypes.map((routeType) => (
          <List.Dropdown.Item key={routeType.id} title={routeType.name} value={routeType.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default function Command() {
  const { isLoading, data } = useFetch<RoutesResponse>(appendApiKey("https://api-v3.mbta.com/routes"), {
    keepPreviousData: true,
  });
  const { data: sortedData, visitItem, resetRanking } = useFrecencySorting(data?.data);
  const [selectedRouteType, setSelectedRouteType] = useState<string>("all");
  const routeTypes: RouteType[] = [
    { id: "all", name: "All" },
    { id: "subway", name: "Subway" },
    { id: "bus", name: "Bus" },
    { id: "commuterRail", name: "Commuter Rail" },
  ];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Select MBTA route..."
      searchBarAccessory={<RouteDropdown routeTypes={routeTypes} onRouteTypeChange={setSelectedRouteType} />}
    >
      <List.Section title="Subway">
        {((["all", "subway"].includes(selectedRouteType) && sortedData) || [])
          .filter((route: Route) => parseInt(route.attributes.type) == 0 || parseInt(route.attributes.type) == 1)
          .map((route) => outputRouteListItem(route, visitItem, resetRanking))}
      </List.Section>
      <List.Section title="Bus">
        {((["all", "bus"].includes(selectedRouteType) && sortedData) || [])
          .filter((route) => parseInt(route.attributes.type) == 3)
          .map((route) => outputRouteListItem(route, visitItem, resetRanking))}
      </List.Section>
      <List.Section title="Commuter Rail">
        {((["all", "commuterRail"].includes(selectedRouteType) && sortedData) || [])
          .filter((route) => parseInt(route.attributes.type) == 2)
          .map((route) => outputRouteListItem(route, visitItem, resetRanking))}
      </List.Section>
    </List>
  );
}
