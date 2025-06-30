import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  Color,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { getClashApi } from "./utils/clash-api";
import {
  ClashConfig,
  ConnectionsResponse,
  Version,
  MODE_NAMES,
  MODE_ICONS,
} from "./utils/types";
import { getExtensionPreferences } from "./utils/config";

interface StatusInfo {
  version?: Version;
  config?: ClashConfig;
  connections?: ConnectionsResponse;
  isHealthy: boolean;
  error?: string;
}

export default function Status() {
  const [status, setStatus] = useState<StatusInfo>({ isHealthy: false });
  const [isLoading, setIsLoading] = useState(true);

  const clashApi = getClashApi();
  const preferences = getExtensionPreferences();

  // Load status information
  const loadStatus = async () => {
    try {
      const [healthCheck, version, config, connections] =
        await Promise.allSettled([
          clashApi.healthCheck(),
          clashApi.getVersion(),
          clashApi.getConfig(),
          clashApi.getConnections(),
        ]);

      const statusInfo: StatusInfo = {
        isHealthy: false,
      };

      // Handle health check results
      if (healthCheck.status === "fulfilled") {
        statusInfo.isHealthy = healthCheck.value.isHealthy;
        statusInfo.error = healthCheck.value.error;
      }

      // Handle version information
      if (version.status === "fulfilled") {
        statusInfo.version = version.value;
      }

      // Handle configuration information
      if (config.status === "fulfilled") {
        statusInfo.config = config.value;
      }

      // Handle connection information
      if (connections.status === "fulfilled") {
        statusInfo.connections = connections.value;
      }

      setStatus(statusInfo);
    } catch (error) {
      console.error("Failed to load status information:", error);
      setStatus({
        isHealthy: false,
        error: error instanceof Error ? error.message : "Failed to load status",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Close all connections
  const closeAllConnections = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Closing all connections...",
    });

    try {
      await clashApi.closeAllConnections();

      toast.style = Toast.Style.Success;
      toast.title = "Connections closed";
      toast.message = "All connections have been successfully closed";

      // Reload status
      await loadStatus();
    } catch (error) {
      console.error("Failed to close connections:", error);
      await showFailureToast(error, { title: "Close failed" });
    }
  };

  // Format traffic
  const formatTraffic = (bytes: number): string => {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  useEffect(() => {
    loadStatus();

    // Set up periodic refresh
    const interval = setInterval(
      loadStatus,
      parseInt(preferences.refreshInterval) * 1000,
    );

    return () => clearInterval(interval);
  }, [preferences.refreshInterval]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="View Clash status information..."
    >
      {/* Connection Status */}
      <List.Section title="Connection Status">
        <List.Item
          title="API Connection"
          subtitle={status.isHealthy ? "Normal" : "Error"}
          icon={{
            source: status.isHealthy ? Icon.CheckCircle : Icon.XMarkCircle,
            tintColor: status.isHealthy ? Color.Green : Color.Red,
          }}
          accessories={[
            {
              text: status.isHealthy ? "🟢" : "🔴",
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Refresh Status"
                icon={Icon.ArrowClockwise}
                onAction={loadStatus}
              />
            </ActionPanel>
          }
        />

        {status.error && (
          <List.Item
            title="Error Information"
            subtitle={status.error}
            icon={{
              source: Icon.ExclamationMark,
              tintColor: Color.Red,
            }}
          />
        )}
      </List.Section>

      {/* Version Information */}
      {status.version && (
        <List.Section title="Version Information">
          <List.Item
            title="Clash Version"
            subtitle={status.version.version}
            icon={{
              source: Icon.Info,
              tintColor: Color.Blue,
            }}
            accessories={[
              {
                text: status.version.premium ? "Premium" : "Free",
              },
              ...(status.version.meta ? [{ text: "Meta" }] : []),
            ]}
          />
        </List.Section>
      )}

      {/* Configuration Information */}
      {status.config && (
        <List.Section title="Configuration Information">
          <List.Item
            title="Proxy Mode"
            subtitle={MODE_NAMES[status.config.mode]}
            icon={{
              source: Icon.Gear,
              tintColor: Color.Orange,
            }}
            accessories={[
              {
                text: MODE_ICONS[status.config.mode],
              },
            ]}
          />

          <List.Item
            title="Mixed Port"
            subtitle={`${status.config["mixed-port"] || "Not set"}`}
            icon={{
              source: Icon.Network,
              tintColor: Color.Purple,
            }}
          />

          <List.Item
            title="HTTP Port"
            subtitle={`${status.config.port || "Not set"}`}
            icon={{
              source: Icon.Globe,
              tintColor: Color.Blue,
            }}
          />

          <List.Item
            title="SOCKS5 Port"
            subtitle={`${status.config["socks-port"] || "Not set"}`}
            icon={{
              source: Icon.Network,
              tintColor: Color.Green,
            }}
          />

          <List.Item
            title="Allow LAN"
            subtitle={status.config["allow-lan"] ? "Yes" : "No"}
            icon={{
              source: status.config["allow-lan"]
                ? Icon.CheckCircle
                : Icon.XMarkCircle,
              tintColor: status.config["allow-lan"] ? Color.Green : Color.Red,
            }}
          />

          <List.Item
            title="Log Level"
            subtitle={status.config["log-level"]}
            icon={{
              source: Icon.Document,
              tintColor: Color.Yellow,
            }}
          />
        </List.Section>
      )}

      {/* Connection Statistics */}
      {status.connections && (
        <List.Section title="Connection Statistics">
          <List.Item
            title="Active Connections"
            subtitle={`${status.connections.connections.length} connections`}
            icon={{
              source: Icon.Link,
              tintColor: Color.Blue,
            }}
            actions={
              <ActionPanel>
                <Action
                  title="Close All Connections"
                  icon={Icon.XMarkCircle}
                  onAction={closeAllConnections}
                />
                <Action
                  title="Refresh Status"
                  icon={Icon.ArrowClockwise}
                  onAction={loadStatus}
                />
              </ActionPanel>
            }
          />

          <List.Item
            title="Upload Traffic"
            subtitle={formatTraffic(status.connections.uploadTotal)}
            icon={{
              source: Icon.ArrowUp,
              tintColor: Color.Green,
            }}
          />

          <List.Item
            title="Download Traffic"
            subtitle={formatTraffic(status.connections.downloadTotal)}
            icon={{
              source: Icon.ArrowDown,
              tintColor: Color.Blue,
            }}
          />
        </List.Section>
      )}

      {/* Actions */}
      <List.Section title="Actions">
        <List.Item
          title="Refresh Status"
          subtitle="Refresh all status information"
          icon={{
            source: Icon.ArrowClockwise,
            tintColor: Color.Blue,
          }}
          actions={
            <ActionPanel>
              <Action
                title="Refresh Status"
                icon={Icon.ArrowClockwise}
                onAction={loadStatus}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
