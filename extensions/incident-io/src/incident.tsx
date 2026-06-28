import { Action, ActionPanel, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";

interface Preferences {
  apiKey: string;
}

interface Incident {
  id: string;
  name: string;
  permalink: string;
  created_at: string;
  status: string;
}

export default function AllIncidentsCommand() {
  const preferences = getPreferenceValues<Preferences>();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchAllIncidents() {
      try {
        const response = await axios.get<{
          incidents: Array<{
            id: string;
            name: string;
            permalink: string;
            created_at: string;
            incident_status: {
              category: string;
            };
          }>;
        }>("https://api.incident.io/v2/incidents", {
          headers: {
            Authorization: `Bearer ${preferences.apiKey}`,
          },
        });

        if (response.data && Array.isArray(response.data.incidents)) {
          const mappedIncidents = response.data.incidents.map((incident) => ({
            id: incident.id,
            name: incident.name,
            permalink: incident.permalink,
            created_at: incident.created_at,
            status: incident.incident_status.category,
          }));

          setIncidents(mappedIncidents);
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: "Unexpected API response",
            message: "The API response does not contain a valid incidents array.",
          });
        }
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch incidents",
          message: String(error),
        });
      } finally {
        setLoading(false);
      }
    }

    fetchAllIncidents();
  }, [preferences.apiKey]);

  return (
    <List isLoading={loading} searchBarPlaceholder="Search incidents...">
      {incidents.map((incident) => (
        <List.Item
          key={incident.id}
          title={incident.name || "No Title"}
          subtitle={`${new Date(incident.created_at).toLocaleString()} | Status: ${incident.status}`}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={incident.permalink} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
