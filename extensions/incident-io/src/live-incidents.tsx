import { Image, MenuBarExtra, Toast, getPreferenceValues, open, showToast } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";

const INCIDENTS_ICON: Image.ImageLike = {
  source: {
    light: "incidentio-dark.png",
    dark: "incidentio-light.png",
  },
};

const ACTIVE_INCIDENTS_ICON = "incidentio-active.png";

interface Preferences {
  apiKey: string;
}

interface Incident {
  id: string;
  name: string;
  permalink: string;
  created_at: string;
}

export default function LiveIncidents() {
  const preferences = getPreferenceValues<Preferences>();
  const [liveIncidents, setLiveIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchLiveIncidents() {
      try {
        const response = await axios.get<{ incidents: Incident[] }>("https://api.incident.io/v2/incidents", {
          params: {
            "status_category[one_of]": "live",
          },
          headers: {
            Authorization: `Bearer ${preferences.apiKey}`,
          },
        });

        if (response.data && Array.isArray(response.data.incidents)) {
          setLiveIncidents(response.data.incidents);
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

    fetchLiveIncidents();
  }, [preferences.apiKey]);

  const liveIncidentCount = liveIncidents.length;
  const menuIcon = liveIncidentCount > 0 ? ACTIVE_INCIDENTS_ICON : INCIDENTS_ICON;

  return (
    <MenuBarExtra icon={menuIcon} tooltip="Active Incidents" isLoading={loading}>
      <MenuBarExtra.Item title={`${liveIncidentCount} Active ${liveIncidentCount === 1 ? "Incident" : "Incidents"}`} />
      {liveIncidents.map((incident) => (
        <MenuBarExtra.Item
          key={incident.id}
          title={incident.name}
          subtitle={new Date(incident.created_at).toLocaleString()}
          onAction={() => open(incident.permalink)}
        />
      ))}
      {liveIncidentCount === 0 && <MenuBarExtra.Item title="No active incidents" />}
    </MenuBarExtra>
  );
}
