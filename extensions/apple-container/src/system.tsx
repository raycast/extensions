import { Action, ActionPanel, Alert, Color, Icon, List, confirmAlert, Keyboard } from "@raycast/api";
import { type ReactNode } from "react";
import { ErrorView } from "./components/ErrorView";
import { useSystemDf, useSystemStatus } from "./hooks/useSystem";
import { errorMessage, startService, stopService } from "./lib/container";
import { humanBytes } from "./lib/format";
import { openSystemLogsInTerminal } from "./lib/terminal";
import { withToast } from "./lib/toast";
import type { SystemDfEntry } from "./lib/types";

const RUNNING = "running";

function SystemActions({ isRunning, revalidate }: { isRunning: boolean; revalidate: () => void }) {
  const start = () =>
    withToast({
      action: startService,
      onStart: "Starting service…",
      onSuccess: "Container service started",
      onFailure: (error) => ({ title: "Failed to start service", message: errorMessage(error) }),
    })().then(revalidate);

  const stop = async () => {
    const confirmed = await confirmAlert({
      title: "Stop the container service?",
      message: "Running containers will be stopped.",
      icon: Icon.Stop,
      primaryAction: { title: "Stop", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }
    await withToast({
      action: stopService,
      onStart: "Stopping service…",
      onSuccess: "Container service stopped",
      onFailure: (error) => ({ title: "Failed to stop service", message: errorMessage(error) }),
    })().then(revalidate);
  };

  const restart = () =>
    withToast({
      action: async () => {
        await stopService();
        await startService();
      },
      onStart: "Restarting service…",
      onSuccess: "Container service restarted",
      onFailure: (error) => ({ title: "Failed to restart service", message: errorMessage(error) }),
    })().then(revalidate);

  return (
    <ActionPanel>
      {isRunning ? (
        <>
          <Action title="Stop Service" icon={Icon.Stop} style={Action.Style.Destructive} onAction={stop} />
          <Action title="Restart Service" icon={Icon.ArrowClockwise} onAction={restart} />
        </>
      ) : (
        <Action title="Start Service" icon={Icon.Play} onAction={start} />
      )}
      <Action title="Open System Logs in Terminal" icon={Icon.Terminal} onAction={() => openSystemLogsInTerminal()} />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
    </ActionPanel>
  );
}

function DfRow({
  title,
  icon,
  entry,
  actions,
}: {
  title: string;
  icon: Icon;
  entry: SystemDfEntry;
  actions: ReactNode;
}) {
  const accessories: List.Item.Accessory[] = [{ text: humanBytes(entry.sizeInBytes) }];
  if (entry.reclaimable > 0) {
    accessories.push({ tag: `${humanBytes(entry.reclaimable)} reclaimable` });
  }
  return (
    <List.Item
      title={title}
      icon={icon}
      subtitle={`${entry.active}/${entry.total} active`}
      accessories={accessories}
      actions={actions}
    />
  );
}

export default function Command() {
  const { data: status, isLoading: statusLoading, error, revalidate: revalidateStatus } = useSystemStatus();
  const { data: df, isLoading: dfLoading, revalidate: revalidateDf } = useSystemDf();

  const revalidate = () => {
    revalidateStatus();
    revalidateDf();
  };

  if (error) {
    return <ErrorView error={error} onRetry={revalidate} />;
  }

  const isRunning = status?.status === RUNNING;
  const statusColor = isRunning ? Color.Green : Color.Red;
  const actions = <SystemActions isRunning={isRunning} revalidate={revalidate} />;

  return (
    <List isLoading={statusLoading || dfLoading}>
      <List.Section title="Service">
        <List.Item
          title="Status"
          icon={{ source: isRunning ? Icon.CircleFilled : Icon.Circle, tintColor: statusColor }}
          accessories={[{ tag: { value: status?.status ?? "unknown", color: statusColor } }]}
          actions={actions}
        />
        {status?.apiServerVersion ? (
          <List.Item title="API Server" subtitle={status.apiServerVersion} icon={Icon.Gear} actions={actions} />
        ) : null}
      </List.Section>
      {df ? (
        <List.Section title="Disk Usage">
          <DfRow title="Containers" icon={Icon.Box} entry={df.containers} actions={actions} />
          <DfRow title="Images" icon={Icon.HardDrive} entry={df.images} actions={actions} />
          <DfRow title="Volumes" icon={Icon.Folder} entry={df.volumes} actions={actions} />
        </List.Section>
      ) : null}
    </List>
  );
}
