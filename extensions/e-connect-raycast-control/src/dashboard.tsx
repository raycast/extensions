import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchDashboardDevices, fetchSystemStatus, getWebUiBaseUrl } from "./econnect";
import type { DeviceConfig, SystemStatusResponse } from "./types";
import { ConnectionErrorView } from "./ui";

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let index = 0;

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }

  return `${size >= 10 || index === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[index]}`;
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function getOverallStatusColor(status: SystemStatusResponse["overall_status"]) {
  switch (status) {
    case "healthy":
      return Color.Green;
    case "warning":
      return Color.Yellow;
    default:
      return Color.Red;
  }
}

export default function Command() {
  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
  const [devices, setDevices] = useState<DeviceConfig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setStatusError(null);

    const [statusResult, devicesResult] = await Promise.allSettled([fetchSystemStatus(), fetchDashboardDevices()]);

    if (statusResult.status === "fulfilled") {
      setStatus(statusResult.value);
    } else {
      setStatus(null);
      setStatusError(statusResult.reason instanceof Error ? statusResult.reason.message : "Failed to load server health.");
    }

    if (devicesResult.status === "fulfilled") {
      setDevices(devicesResult.value);
    } else {
      setDevices([]);
      setError(devicesResult.reason instanceof Error ? devicesResult.reason.message : "Failed to load dashboard data.");
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const fleetSummary = useMemo(() => {
    const approved = devices.filter((device) => device.auth_status === "approved");
    return {
      total: approved.length,
      online: approved.filter((device) => device.conn_status === "online").length,
      offline: approved.filter((device) => device.conn_status !== "online").length,
      pending: devices.filter((device) => device.auth_status !== "approved").length,
    };
  }, [devices]);

  if (error && status === null && devices.length === 0) {
    return <ConnectionErrorView title="Unable to load E-Connect" message={error} />;
  }

  const webUiUrl = getWebUiBaseUrl();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Inspect server health and fleet summary">
      <List.Section title="Server">
        <List.Item
          title="Overall Health"
          subtitle={status?.overall_status ?? "Unavailable"}
          icon={{ source: Icon.Circle, tintColor: status ? getOverallStatusColor(status.overall_status) : Color.SecondaryText }}
          accessories={[{ text: status?.current_server_time ? new Date(status.current_server_time).toLocaleString() : statusError ?? "No runtime data" }]}
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={load} />
              <Action.OpenInBrowser title="Open E-Connect Web UI" url={webUiUrl} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
        <List.Item
          title="MQTT Broker"
          subtitle={status?.mqtt_status ?? "Unavailable"}
          accessories={[{ text: status?.database_status ? `DB ${status.database_status}` : statusError ?? "DB unavailable" }]}
        />
        <List.Item
          title="Uptime"
          subtitle={status ? formatUptime(status.uptime_seconds) : "Unavailable"}
          accessories={[
            {
              text: status?.advertised_host?.trim() ? status.advertised_host : "No advertised host",
            },
          ]}
        />
        <List.Item
          title="Resource Usage"
          subtitle={status ? `${formatPercent(status.cpu_percent)} CPU` : "Unavailable"}
          accessories={[
            { text: status ? `${formatBytes(status.memory_used)} / ${formatBytes(status.memory_total)} RAM` : "No RAM data" },
            { text: status ? `${formatBytes(status.storage_used)} / ${formatBytes(status.storage_total)} Disk` : "No disk data" },
          ]}
        />
        <List.Item
          title="Alerts"
          subtitle={status ? `${status.active_alert_count} unread` : "Unavailable"}
          accessories={[{ text: status?.latest_alert_message ?? "No unread alerts" }]}
        />
      </List.Section>

      <List.Section title="Fleet">
        <List.Item title="Approved Devices" subtitle={String(fleetSummary.total)} accessories={[{ text: `${fleetSummary.online} online` }]} />
        <List.Item title="Offline Devices" subtitle={String(fleetSummary.offline)} accessories={[{ text: `${fleetSummary.pending} pending or hidden` }]} />
      </List.Section>

      <List.Section title="Shortcuts">
        <List.Item
          title="Open E-Connect Web UI"
          subtitle={webUiUrl}
          icon={Icon.Globe}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Browser" url={webUiUrl} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={load} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
