import { ActionPanel, Action, Icon } from "@raycast/api";
import { Monitor } from "../types";
import { useMonitorActions } from "../hooks/useMonitorActions";
import { getEffectiveStatus } from "../utils/monitorUtils";

interface MonitorActionsProps {
  monitor: Monitor;
  apiKey: string;
}

export function MonitorActions({ monitor, apiKey }: MonitorActionsProps) {
  const { pauseMonitor, resumeMonitor, deleteMonitor, isLoading } =
    useMonitorActions(apiKey);

  const handlePause = async () => {
    if (isLoading) return;
    await pauseMonitor(monitor.id, monitor.name);
  };

  const handleResume = async () => {
    if (isLoading) return;
    await resumeMonitor(monitor.id, monitor.name);
  };

  const handleDelete = async () => {
    if (isLoading) return;
    await deleteMonitor(monitor.id, monitor.name);
  };

  const effectiveStatus = getEffectiveStatus(monitor);

  return (
    <ActionPanel>
      <Action.OpenInBrowser
        title="Open Monitor in Browser"
        url={`https://app.phare.io/uptime/monitors/${monitor.id}`}
      />
      {effectiveStatus !== "paused" ? (
        <Action
          title="Pause Monitor"
          icon={Icon.Pause}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          onAction={handlePause}
        />
      ) : (
        <Action
          title="Resume Monitor"
          icon={Icon.Play}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          onAction={handleResume}
        />
      )}
      <Action
        title="Delete Monitor"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
        onAction={handleDelete}
      />
    </ActionPanel>
  );
}
