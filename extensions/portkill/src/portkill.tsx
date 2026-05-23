import { Action, ActionPanel, Alert, Icon, List, confirmAlert, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PortListItem } from "./components/PortListItem";
import { statusSummary } from "./lib/format";
import { getKillMethodDescription, getPlatformLabel } from "./lib/platform";
import { killProcess, killProcesses } from "./lib/process-killer";
import { PortScannerError, scanPorts } from "./lib/port-scanner";
import type { PortProcess } from "./lib/types";

const sharedShortcuts = {
  refresh: { modifiers: ["cmd"] as const, key: "r" as const },
  killAll: { modifiers: ["cmd"] as const, key: "k" as const },
};

function ListActions({
  onRefresh,
  onKillAll,
  isShowingDetail,
  onToggleDetail,
}: {
  onRefresh: () => void;
  onKillAll: () => void;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
}) {
  return (
    <ActionPanel>
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} shortcut={sharedShortcuts.refresh} />
      <Action
        title="Kill All"
        icon={Icon.Skull}
        style={Action.Style.Destructive}
        onAction={onKillAll}
        shortcut={sharedShortcuts.killAll}
      />
      <ActionPanel.Section>
        <Action
          title={isShowingDetail ? "Hide Details" : "Show Details"}
          icon={Icon.Sidebar}
          onAction={onToggleDetail}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export default function Command() {
  const [ports, setPorts] = useState<PortProcess[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const killMethodDescription = getKillMethodDescription();
  const platformLabel = getPlatformLabel();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await scanPorts();
      setPorts(result);
      setError(null);
    } catch (caught) {
      const message =
        caught instanceof PortScannerError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "Failed to scan ports";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const uniqueProcessCount = useMemo(() => new Set(ports.map((entry) => entry.pid)).size, [ports]);
  const sectionSubtitle = useMemo(
    () => statusSummary(ports.length, uniqueProcessCount, isLoading),
    [ports.length, uniqueProcessCount, isLoading],
  );

  async function handleKill(entry: PortProcess) {
    const confirmed = await confirmAlert({
      title: `Kill ${entry.processName}?`,
      message: `Port ${entry.port}, PID ${entry.pid}. ${killMethodDescription}`,
      primaryAction: { title: "Kill Process", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) {
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: `Killing ${entry.processName}…` });
    try {
      await killProcess(entry.pid);
      toast.style = Toast.Style.Success;
      toast.title = `Stopped ${entry.processName}`;
      await refresh();
    } catch (caught) {
      toast.style = Toast.Style.Failure;
      toast.title = caught instanceof Error ? caught.message : "Could not kill process";
    }
  }

  async function handleKillAll() {
    const targets = [...new Set(ports.map((entry) => entry.pid))];
    if (targets.length === 0) {
      return;
    }

    const killTitle = targets.length === 1 ? "Kill 1 Process" : `Kill ${targets.length} Processes`;
    const confirmed = await confirmAlert({
      title: "Kill all listed processes?",
      message: killMethodDescription,
      primaryAction: { title: killTitle, style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) {
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Killing processes…" });
    try {
      await killProcesses(targets);
      toast.style = Toast.Style.Success;
      toast.title = targets.length === 1 ? "Stopped 1 process" : `Stopped ${targets.length} processes`;
      await refresh();
    } catch (caught) {
      toast.style = Toast.Style.Failure;
      toast.title = caught instanceof Error ? caught.message : "Could not kill processes";
      await refresh();
    }
  }

  const listActions = (
    <ListActions
      onRefresh={refresh}
      onKillAll={handleKillAll}
      isShowingDetail={isShowingDetail}
      onToggleDetail={() => setIsShowingDetail((showing) => !showing)}
    />
  );

  const emptyTitle = error ? "Could not scan ports" : isLoading ? "Scanning…" : "All quiet";
  const emptyDescription =
    error ?? (isLoading ? `Checking TCP listeners on ${platformLabel}.` : "No TCP ports are listening.");

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search port, app, or PID…"
      actions={listActions}
      isShowingDetail={isShowingDetail}
    >
      <List.EmptyView
        icon={error ? Icon.ExclamationMark : isLoading ? Icon.Circle : Icon.CheckCircle}
        title={emptyTitle}
        description={emptyDescription}
        actions={
          <ActionPanel>
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} shortcut={sharedShortcuts.refresh} />
          </ActionPanel>
        }
      />

      <List.Section subtitle={sectionSubtitle}>
        {ports.map((entry) => (
          <PortListItem
            key={entry.id}
            entry={entry}
            onKill={handleKill}
            onRefresh={refresh}
            onKillAll={handleKillAll}
            isShowingDetail={isShowingDetail}
            onToggleDetail={() => setIsShowingDetail((showing) => !showing)}
          />
        ))}
      </List.Section>
    </List>
  );
}
