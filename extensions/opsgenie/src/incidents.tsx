import { ActionPanel, getPreferenceValues, List, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";

import { Preferences } from "./preferences";
import { useDebounce } from "./useDebounce";

const preferences: Preferences = getPreferenceValues();

const IncidentList = () => {
  const [query, setQuery] = useState(preferences.incidentsQuery);
  const debouncedQuery = useDebounce<string>(query, 1000);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  const setSearchText = (text: string) => {
    setQuery(text);
  };

  const fetch = async (query: string) => {
    setIsLoading(true);
    setIncidents(await fetchIncident(query));
    setIsLoading(false);
  };

  useEffect(() => {
    fetch(debouncedQuery);
  }, [debouncedQuery]);

  return (
    <List
      searchText={query}
      onSearchTextChange={setSearchText}
      enableFiltering={false}
      isLoading={isLoading}
      searchBarPlaceholder="Filter incidents..."
    >
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
      accessoryTitle={`${createdAt.toLocaleDateString()} ${createdAt.toLocaleTimeString()}`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`${preferences.url}/incident/detail/${incident.id}/details`} />
        </ActionPanel>
      }
    />
  );
};

const fetchIncident = async (query: string): Promise<Incident[]> => {
  try {
    const response = await fetch(
      `${preferences.apiUrl}/v1/incidents?query=${encodeURIComponent(query)}&limit=100&sort=createdAt&order=desc`,
      {
        headers: {
          Authorization: `GenieKey ${preferences.apiKey}`,
        },
      }
    );

    const json = await response.json();

    if (response.status >= 200 && response.status < 300) {
      if ((json as Record<string, unknown>).data) {
        return (json as Record<string, unknown>).data as Incident[];
      }

      return [];
    } else {
      if ((json as Record<string, string>).message) throw new Error((json as Record<string, string>).message);
      throw new Error("An unknown error occured");
    }
  } catch (error) {
    console.error(error);
    showToast(Toast.Style.Failure, `Could not load incidents: ${error.message}`);
    return Promise.resolve([]);
  }
};

type Incident = {
  id: string;
  message: string;
  status: string;
  tags: string[];
  createdAt: string;
  priority: string;
};
