import React from "react";
import { showToast, Toast, getPreferenceValues, List, ActionPanel, Action } from "@raycast/api";
import https from "https";
import fetch from "node-fetch";

// Define the TrueNAS API base URL
const preferences = getPreferenceValues<{
  apiUrl: string;
  apiKey: string;
  rejectUnauthorized: boolean;
}>();

const API_URL = preferences.apiUrl;
const API_KEY = preferences.apiKey;
const REJECT_UNAUTHORIZED = preferences.rejectUnauthorized;
const TRUENAS_API_BASE_URL = `${API_URL}/api/v2.0`;

const agent = new https.Agent({
  rejectUnauthorized: REJECT_UNAUTHORIZED,
});

// Fectch the list of applications
async function fetchApps(): Promise<object[]> {
  const url = `${TRUENAS_API_BASE_URL}/chart/release`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      agent,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch applications: ${response.statusText}`);
    }

    return (await response.json()) as object[];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    showToast({ style: Toast.Style.Failure, title: `Error`, message: errorMessage });
    return [];
  }
}

// Function to manage applications
async function manageApp(action: 0 | 1, appName: string, state: string) {
  if (state === "ACTIVE" && action === 1) {
    showToast({ style: Toast.Style.Failure, title: `Application is already running` });
    return;
  } else if (state === "STOPPED" && action === 0) {
    showToast({ style: Toast.Style.Failure, title: `Application is already stopped` });
    return;
  }
  const url = `${TRUENAS_API_BASE_URL}/chart/release/scale`;
  const body = {
    release_name: appName,
    scale_options: {
      replica_count: action,
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      agent,
    });

    if (!response.ok) {
      throw new Error(`Failed to ${action} application: ${response.statusText}`);
    }

    showToast({
      style: Toast.Style.Success,
      title: action === 1 ? `Application started successfully` : `Application stopped successfully`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    showToast({ style: Toast.Style.Failure, title: `Error`, message: errorMessage });
  }
}

async function restartApp(appName: string, state: string) {
  if (state === "STOPPED") {
    showToast({ style: Toast.Style.Failure, title: `Application is stopped` });
    return;
  }
  manageApp(0, appName, state);
  setTimeout(() => {
    manageApp(1, appName, state);
  }, 5000);
  showToast({ style: Toast.Style.Success, title: `Application restarted successfully` });
}

// Main component
export default function Command() {
  const [apps, setApps] = React.useState<object[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetch the list of applications when the component mounts
  React.useEffect(() => {
    async function loadApps() {
      const fetchedApps = await fetchApps();
      setApps(fetchedApps);
      setIsLoading(false);
    }
    loadApps();
  }, []);

  return (
    <List isLoading={isLoading}>
      {apps.map((app) => (
        <List.Item
          key={app.name}
          title={app.name}
          subtitle={`State: ${app.status}`}
          actions={
            <ActionPanel>
              <Action title="Start" onAction={() => manageApp(1, app.name, app.status)} />
              <Action title="Stop" onAction={() => manageApp(0, app.name, app.status)} />
              <Action title="Restart" onAction={() => restartApp(app.name, app.status)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
