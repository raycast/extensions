import { ActionPanel, getPreferenceValues, List, OpenInBrowserAction, showToast, ToastStyle } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";

import { Preferences } from "./preferences";

const preferences: Preferences = getPreferenceValues();

export default function IncidentList() {
  const [state, setState] = useState<{ incidents: Incident[] }>({ incidents: [] });

  async function fetch(query: string) {
    const incidents = await fetchIncident(query);

    setState((oldState) => ({
      ...oldState,
      incidents: incidents,
    }));
  }

  useEffect(() => {
    fetch("");
  }, []);

  return (
    <List
      isLoading={state.incidents.length === 0}
      searchBarPlaceholder="Filter incidents..."
      throttle={true}
      onSearchTextChange={(text: string) => fetch(text)}
    >
      {state.incidents.map((incident) => (
        <IncidentListItem key={incident.id} incident={incident} />
      ))}
    </List>
  );
}

function IncidentListItem(props: { incident: Incident }) {
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
          <OpenInBrowserAction url={`${preferences.url}/incident/detail/${incident.id}/details`} />
        </ActionPanel>
      }
    />
  );
}

async function fetchIncident(query: string): Promise<Incident[]> {
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
    showToast(ToastStyle.Failure, `Could not load incidents: ${error.message}`);
    return Promise.resolve([]);
  }
}

type Incident = {
  id: string;
  message: string;
  status: string;
  tags: string[];
  createdAt: string;
  priority: string;
};
