import { List, showToast, Toast, Icon, Color, Action, ActionPanel } from "@raycast/api";
import { useEffect, useState } from "react";
import axios from "axios";
import { open } from "@raycast/api";

interface Component {
  id: string;
  name: string;
  status: string;
}

const DESIRED_SERVICES = [
  "Automations",
  "Deployments",
  "Device Scans",
  "Package Library",
  "Web Admin",
  "PDQ Connect Agent",
];

const STATUS_PAGE_URL = "https://pdq.statuspage.io/";

export default function Command() {
  const [components, setComponents] = useState<Component[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await axios.get("https://pdq.statuspage.io/api/v2/summary.json");
        const filteredComponents = response.data.components.filter((component: Component) =>
          DESIRED_SERVICES.some((service) => component.name.toLowerCase().includes(service.toLowerCase())),
        );
        setComponents(filteredComponents);
      } catch (error) {
        console.error("Error fetching status:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch PDQ Connect status",
          message: "Please try again later",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchStatus();
  }, []);

  return (
    <List isLoading={isLoading}>
      {DESIRED_SERVICES.map((service) => {
        const component = components.find((c) => c.name.toLowerCase().includes(service.toLowerCase()));
        const status = component?.status || "unknown";
        return (
          <List.Item
            key={service}
            title={service}
            icon={{ source: Icon.Circle, tintColor: getStatusColor(status) }}
            accessories={[{ text: capitalizeFirstLetter(status) }]}
            actions={
              <ActionPanel>
                <Action title="Open Status Page" onAction={() => open(STATUS_PAGE_URL)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function getStatusColor(status: string): Color {
  switch (status.toLowerCase()) {
    case "operational":
      return Color.Green;
    case "degraded_performance":
      return Color.Orange;
    case "partial_outage":
      return Color.Yellow;
    case "major_outage":
      return Color.Red;
    default:
      return Color.SecondaryText;
  }
}

function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase().replace("_", " ");
}
