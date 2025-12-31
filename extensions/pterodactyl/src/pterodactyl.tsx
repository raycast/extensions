import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Color,
  Icon,
  confirmAlert,
  confirmAlert,
  Alert,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getServers, setPowerState, getServerResources } from "./api/pterodactyl";
import { Server, ServerResources } from "./api/types";

import ServerConsole from "./console";
import ServerMonitor from "./monitor";

export default function Command() {
  const [servers, setServers] = useState<Server[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    fetchServers();
  }, []);

  async function fetchServers() {
    setIsLoading(true);
    try {
      const data = await getServers();
      setServers(data);
      setRefreshTick((prev) => prev + 1);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch servers",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search servers...">
      {servers.map((server) => (
        <ServerListItem
          key={server.attributes.uuid}
          server={server}
          refreshTick={refreshTick}
          onRefresh={fetchServers}
        />
      ))}
    </List>
  );
}

function ServerListItem({
  server,
  refreshTick,
  onRefresh,
}: {
  server: Server;
  refreshTick: number;
  onRefresh: () => void;
}) {
  const [stats, setStats] = useState<ServerResources["attributes"] | null>(null);
  const preferences = getPreferenceValues();
  const panelUrl = preferences.pterodactylUrl.endsWith("/")
    ? preferences.pterodactylUrl.slice(0, -1)
    : preferences.pterodactylUrl;
  const serverUrl = `${panelUrl}/server/${server.attributes.identifier}`;

  useEffect(() => {
    let isMounted = true;
    getServerResources(server.attributes.identifier).then((data) => {
      if (isMounted) setStats(data);
    });
    return () => {
      isMounted = false;
    };
  }, [server.attributes.identifier, refreshTick]);

  const stateColor = {
    running: Color.Green,
    offline: Color.Red,
    starting: Color.Yellow,
    stopping: Color.Orange,
  }[stats?.current_state || "offline"];

  const cpu = stats ? `${Math.round(stats.resources.cpu_absolute)}%` : "---";
  const memory = stats ? `${Math.round(stats.resources.memory_bytes / 1024 / 1024)}MB` : "---";

  return (
    <List.Item
      icon={{ source: Icon.HardDrive, tintColor: stateColor }}
      title={server.attributes.name}
      subtitle={server.attributes.description}
      accessories={[
        { text: stats?.current_state?.toUpperCase() || "Checking...", tooltip: "State" },
        { text: `CPU: ${cpu}`, tooltip: "CPU Usage" },
        { text: `MEM: ${memory}`, tooltip: "Memory Usage" },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Management">
            <Action.Push
              title="Open Console"
              icon={Icon.Terminal}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              target={<ServerConsole server={server} />}
            />
            <Action.Push
              title="Open Monitor"
              icon={Icon.BarChart}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              target={<ServerMonitor server={server} />}
            />
            <Action.OpenInBrowser
              title="Open Panel in Browser"
              url={serverUrl}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            <Action.CopyToClipboard content={server.attributes.identifier} title="Copy Server ID" />
            <Action.CopyToClipboard content={server.attributes.uuid} title="Copy Full Server UUID" />
            <Action title="Refresh List" icon={Icon.ArrowClockwise} onAction={onRefresh} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Power Actions">
            {(!stats || stats.current_state === "offline") && (
              <Action
                title="Start Server"
                icon={Icon.Play}
                onAction={() => handlePowerAction(server, "start", onRefresh)}
              />
            )}
            {(!stats || stats.current_state === "running" || stats.current_state === "starting") && (
              <>
                <Action
                  title="Restart Server"
                  icon={Icon.RotateAntiClockwise}
                  onAction={() => handlePowerAction(server, "restart", onRefresh)}
                />
                <Action
                  title="Stop Server"
                  icon={Icon.Stop}
                  style={Action.Style.Destructive}
                  onAction={() => handlePowerAction(server, "stop", onRefresh)}
                />
                <Action
                  title="Kill Server"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "k" }}
                  onAction={() => handlePowerAction(server, "kill", onRefresh)}
                />
              </>
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function handlePowerAction(server: Server, signal: "start" | "stop" | "restart" | "kill", onRefresh: () => void) {
  // Always confirm power actions to prevent mistakes
  if (
    !(await confirmAlert({
      title: `Are you sure you want to ${signal} ${server.attributes.name}?`,
      icon: Icon.Warning,
      primaryAction: {
        title: signal.charAt(0).toUpperCase() + signal.slice(1),
        style: signal === "kill" || signal === "stop" ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
      },
    }))
  ) {
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: `Sending ${signal} signal...` });
  try {
    await setPowerState(server.attributes.identifier, signal);
    toast.style = Toast.Style.Success;
    toast.title = `Signal ${signal} sent`;

    // Poll for status updates
    const delays = [1000, 2000, 4000, 6000, 10000, 15000, 20000, 30000];
    delays.forEach((delay) => {
      setTimeout(() => {
        onRefresh();
      }, delay);
    });
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to send signal";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
