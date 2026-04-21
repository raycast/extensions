import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  Color,
  getPreferenceValues,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

interface HotelServer {
  target?: string;
  status?: string;
  cwd?: string;
  command?: string[];
  env?: {
    PORT?: string;
  };
}

interface HotelServers {
  [key: string]: HotelServer;
}

const HOTEL_URL = "http://localhost:2000";

// Mock data for screenshots
const mockServers: HotelServers = {
  "my-app": {
    target: "http://localhost:3000",
    status: "running",
    command: ["npm", "start"],
    env: {
      PORT: "3000",
    },
  },
  "api-server": {
    target: "http://localhost:4000",
    status: "running",
    command: ["node", "server.js"],
    env: {
      PORT: "4000",
    },
  },
  "stopped-app": {
    target: "http://localhost:5000",
    status: "stopped",
    command: ["python", "app.py"],
    env: {
      PORT: "5000",
    },
  },
  "react-dashboard": {
    target: "http://localhost:3001",
    status: "running",
    command: ["yarn", "dev"],
    env: {
      PORT: "3001",
    },
  },
};

function getHotelTld(): string {
  // 1. Check ~/.hotel/conf.json
  try {
    const configPath = path.join(os.homedir(), ".hotel", "conf.json");
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      const config = JSON.parse(content);
      if (config.tld) {
        return config.tld;
      }
    }
  } catch (e) {
    console.error("Error reading hotel config:", e);
  }

  // 3. Default
  return "local";
}

export default function Command() {
  const tld = getHotelTld();
  const { mockMode } = getPreferenceValues<ExtensionPreferences>();

  // Only fetch real data when not in mock mode
  const { isLoading, data, revalidate } = mockMode
    ? { isLoading: false, data: null, revalidate: () => {} }
    : useFetch<HotelServers>(`${HOTEL_URL}/_/servers`, {
        onError: (error) => {
          showToast(
            Toast.Style.Failure,
            "Failed to fetch Hotel servers",
            error.message,
          );
        },
      });

  // Use mock data if mock mode is enabled
  const serversData = mockMode ? mockServers : data;

  const toggleServer = async (name: string, action: "start" | "stop") => {
    if (mockMode) {
      // In mock mode, simulate server state change
      showToast(
        Toast.Style.Success,
        `${action === "start" ? "Started" : "Stopped"} ${name}`,
      );
      return;
    }

    try {
      const response = await fetch(`${HOTEL_URL}/_/servers/${name}/${action}`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(response.statusText);
      showToast(
        Toast.Style.Success,
        `${action === "start" ? "Started" : "Stopped"} ${name}`,
      );
      revalidate();
    } catch (error) {
      showToast(
        Toast.Style.Failure,
        `Failed to ${action} ${name}`,
        String(error),
      );
    }
  };

  return (
    <List
      isLoading={isLoading && !mockMode}
      searchBarPlaceholder="Search Hotel apps..."
    >
      {serversData &&
        Object.entries(serversData).map(([name, info]) => {
          const isRunning = info.status !== "stopped";
          const appUrl = `http://${name}.${tld}`;
          const localUrl = info.target || "";

          return (
            <List.Item
              key={name}
              title={name}
              subtitle={isRunning ? info.target || "Running" : "Stopped"}
              icon={
                isRunning
                  ? { source: Icon.Circle, tintColor: Color.Green }
                  : { source: Icon.Circle, tintColor: Color.Red }
              }
              accessories={[
                {
                  tag: {
                    value: isRunning ? "ON" : "OFF",
                    color: isRunning ? Color.Green : Color.Red,
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.OpenInBrowser
                      url={appUrl}
                      title={`Open in Browser (${tld})`}
                    />
                    {isRunning && localUrl && (
                      <Action.OpenInBrowser
                        url={localUrl}
                        title="Open Direct URL"
                        shortcut={{ modifiers: ["opt"], key: "enter" }}
                      />
                    )}
                    <Action.CopyToClipboard
                      content={appUrl}
                      title="Copy URL"
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section>
                    <Action
                      title={isRunning ? "Stop App" : "Start App"}
                      icon={isRunning ? Icon.Stop : Icon.Play}
                      onAction={() =>
                        toggleServer(name, isRunning ? "stop" : "start")
                      }
                    />
                    <Action
                      title="Restart App"
                      icon={Icon.RotateClockwise}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                      onAction={async () => {
                        await toggleServer(name, "stop");
                        await toggleServer(name, "start");
                      }}
                    />
                  </ActionPanel.Section>

                  {info.cwd && (
                    <ActionPanel.Section>
                      <Action.OpenWith
                        path={info.cwd}
                        title="Open Project Folder"
                        shortcut={{ modifiers: ["ctrl"], key: "enter" }}
                      />
                    </ActionPanel.Section>
                  )}
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
