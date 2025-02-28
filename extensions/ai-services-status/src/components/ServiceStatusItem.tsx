import { List, ActionPanel, Action, open } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Service, StatusResponse } from "../types";
import { extractStatusFromJson, determineOverallStatus, getStatusIcon } from "../utils";

// Component for handling individual service status
export function ServiceStatusItem({ service }: { service: Service }) {
  // Use useFetch to get data
  const { isLoading, data, revalidate } = useFetch<StatusResponse>(service.apiUrl === "N/A" ? "" : service.apiUrl, {
    // For unavailable APIs, return null directly
    execute: service.apiUrl !== "N/A",
    onError: (error) => {
      console.error(`Error fetching ${service.name} status:`, error);
    },
  });

  // Calculate service status
  let status = "Unknown";
  let lastUpdate = "Unknown";

  if (service.apiUrl === "N/A") {
    status = "Press enter to check";
  } else if (isLoading) {
    status = "Loading...";
  } else if (data) {
    try {
      // Data is already an object, no need to parse again
      const { overallStatus, updatedAt } = extractStatusFromJson(data);
      status = determineOverallStatus(overallStatus);
      lastUpdate = updatedAt;
    } catch (error) {
      status = "Error processing data";
      console.error(`Error processing data for ${service.name}:`, error);
    }
  } else {
    status = "Error fetching status";
  }

  return (
    <List.Item
      title={`${getStatusIcon(status)} ${service.name}`}
      subtitle={status}
      accessories={[{ text: lastUpdate }]}
      actions={
        <ActionPanel>
          <Action title="Open Status Page" onAction={() => open(service.statusPageUrl)} />
          <Action title="Refresh" onAction={() => revalidate()} />
        </ActionPanel>
      }
    />
  );
}
