import { ActionPanel, getPreferenceValues, List, Action } from "@raycast/api";
import { useState } from "react";

import { useFetch } from "@raycast/utils";
import { ErrorResult, Incident, PaginatedResult } from "./types";

const preferences = getPreferenceValues<Preferences>();

const IncidentList = () => {
  const [query, setQuery] = useState(preferences.incidentsQuery);

  const setSearchText = (text: string) => {
    setQuery(text);
  };

  const { isLoading, data: incidents } = useFetch(
    `${preferences.apiUrl}/v1/incidents?query=${encodeURIComponent(query)}&limit=100&sort=createdAt&order=desc`,
    {
      headers: {
        Authorization: `GenieKey ${preferences.apiKey}`,
      },
      async parseResponse(response) {
        const result = (await response.json()) as ErrorResult | PaginatedResult<Incident>;
        if ("message" in result) throw new Error(result.message);
        if (!response.ok) throw new Error("An unknown error occurred");
        return result.data;
      },
      initialData: [],
      failureToastOptions: {
        title: "Could not load incidents",
      },
    },
  );

  return (
    <List
      searchText={query}
      onSearchTextChange={setSearchText}
      filtering={false}
      isLoading={isLoading}
      searchBarPlaceholder="Filter incidents..."
      throttle
    >
      {!isLoading && !incidents.length && (
        <List.EmptyView icon="fe6c..svg" title="It looks like you haven't created any incidents yet." />
      )}
      {incidents.map((incident) => (
        <IncidentListItem key={incident.id} incident={incident} />
      ))}
    </List>
  );
};

export default IncidentList;

const IncidentListItem = (props: { incident: Incident }) => {
  const incident = props.incident;

  const createdAt = new Date(incident.createdAt);
  const subtitle = incident.status === "closed" ? "Closed" : "Open";
  const icon =
    incident.priority === "P1"
      ? "icon-p1.png"
      : incident.priority === "P2"
        ? "icon-p2.png"
        : incident.priority === "P3"
          ? "icon-p3.png"
          : incident.priority === "P4"
            ? "icon-p4.png"
            : "icon-p5.png";

  return (
    <List.Item
      id={incident.id}
      key={incident.id}
      title={incident.message}
      subtitle={`${subtitle}${incident.tags && incident.tags.length > 0 ? ` [${incident.tags.join(", ")}]` : ""}`}
      icon={icon}
      keywords={[incident.status, incident.priority, ...incident.tags]}
      accessories={[{ text: `${createdAt.toLocaleDateString()} ${createdAt.toLocaleTimeString()}` }]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`${preferences.url}/incident/detail/${incident.id}/details`} />
        </ActionPanel>
      }
    />
  );
};
