import { Action, ActionPanel, Alert, Color, Icon, Keyboard, List, confirmAlert, showToast, Toast } from "@raycast/api";
import { primaryShortcut } from "./lib/shortcuts";
import { getProgressIcon } from "@raycast/utils";
import { dirname } from "node:path";
import { useMemo, useState } from "react";
import { BlipErrorView } from "./components/BlipErrorView";
import { useBlipState } from "./hooks/useBlipState";
import {
  acceptTransfer,
  cancelTransfer,
  declineTransfer,
  pauseTransfer,
  removeTransfer,
  resumeTransfer,
} from "./lib/actions";
import { formatBytes, formatSpeed, listTransfers, type TransferRow } from "./lib/model";

async function run(title: string, action: () => Promise<void>) {
  try {
    await action();
    await showToast({ style: Toast.Style.Success, title });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Blip action failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function rowIcon(row: TransferRow) {
  if (row.errorMessage) return { source: Icon.ExclamationMark, tintColor: Color.Red };
  if (row.needsResponse) return { source: Icon.Download, tintColor: Color.Blue };
  if (row.isFinishedOk) return { source: Icon.CheckCircle, tintColor: Color.Green };
  if (!row.isOpen) return { source: Icon.XMarkCircle, tintColor: Color.SecondaryText };
  if (row.isActive && row.fraction !== undefined) return getProgressIcon(row.fraction, Color.Blue);
  return row.incoming ? Icon.ArrowDownCircle : Icon.ArrowUpCircle;
}

function accessories(row: TransferRow): List.Item.Accessory[] {
  const result: List.Item.Accessory[] = [];
  if (row.isActive && row.fraction !== undefined) result.push({ text: `${Math.round(row.fraction * 100)}%` });
  const speed = row.isActive ? formatSpeed(row.transfer.stats?.kbps) : undefined;
  if (speed) result.push({ text: speed });
  if (row.totalBytes) result.push({ text: formatBytes(row.totalBytes) });
  result.push({
    tag: { value: row.statusLabel, color: row.errorMessage ? Color.Red : row.needsResponse ? Color.Blue : undefined },
    tooltip: row.errorMessage,
  });
  if (row.updatedAt) result.push({ date: new Date(row.updatedAt) });
  return result;
}

export default function Command() {
  const { state, error, isLoading } = useBlipState();
  const [filter, setFilter] = useState<"all" | "incoming" | "outgoing">("all");
  const rows = useMemo(() => (state ? listTransfers(state) : []), [state]);

  if (error && !state) return <BlipErrorView error={error} />;

  const filtered = rows.filter((row) => filter === "all" || (filter === "incoming" ? row.incoming : !row.incoming));
  const waiting = filtered.filter((row) => row.needsResponse);
  const inProgress = filtered.filter((row) => !row.needsResponse && row.isOpen);
  const done = filtered.filter((row) => !row.isOpen);

  const clearHistory = async () => {
    const what = filter === "all" ? "" : `${filter} `;
    const count = `${done.length} finished ${what}transfer${done.length === 1 ? "" : "s"}`;
    const confirmed = await confirmAlert({
      title: `Clear ${count}?`,
      message: "They're removed from Blip's history. Files already on disk are kept.",
      primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: `Clearing ${count}…` });
    try {
      for (const row of done) await removeTransfer(row.id, false);
      toast.style = Toast.Style.Success;
      toast.title = `Cleared ${count}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't clear history";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  };
  const clearHistoryAction = done.length > 0 && (
    <Action
      title={`Clear History (${done.length})`}
      icon={Icon.Eraser}
      style={Action.Style.Destructive}
      shortcut={Keyboard.Shortcut.Common.RemoveAll}
      onAction={clearHistory}
    />
  );

  const renderRow = (row: TransferRow) => (
    <List.Item
      key={row.id}
      icon={rowIcon(row)}
      title={row.title}
      subtitle={`${row.incoming ? "from" : "to"} ${row.peerName}`}
      keywords={[row.peerName, row.statusLabel]}
      accessories={accessories(row)}
      actions={
        <ActionPanel>
          {row.needsResponse && (
            <ActionPanel.Section>
              <Action title="Accept" icon={Icon.Check} onAction={() => run("Accepted", () => acceptTransfer(row.id))} />
              <Action
                title="Decline"
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
                onAction={() => run("Declined", () => declineTransfer(row.id))}
              />
            </ActionPanel.Section>
          )}
          {row.localPaths[0] && (
            <ActionPanel.Section>
              <Action.ShowInFinder path={row.localPaths[0]} />
              {row.localPaths.length === 1 && <Action.Open title="Open" target={row.localPaths[0]} />}
              <Action.CopyToClipboard
                title="Copy Path"
                content={row.localPaths.length === 1 ? row.localPaths[0] : dirname(row.localPaths[0])}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            {row.canPause && (
              <Action
                title="Pause"
                icon={Icon.Pause}
                shortcut={primaryShortcut("p", true)}
                onAction={() => run("Paused", () => pauseTransfer(row.id))}
              />
            )}
            {row.canResume && (
              <Action
                title="Resume"
                icon={Icon.Play}
                shortcut={primaryShortcut("r", true)}
                onAction={() => run("Resuming", () => resumeTransfer(row.id))}
              />
            )}
            {row.canCancel && !row.needsResponse && (
              <Action
                title="Cancel Transfer"
                icon={Icon.Stop}
                style={Action.Style.Destructive}
                shortcut={primaryShortcut("x", true)}
                onAction={() => run("Cancelled", () => cancelTransfer(row.id))}
              />
            )}
            {!row.isOpen && (
              <Action
                title="Remove from History"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={async () => {
                  const confirmed = await confirmAlert({
                    title: "Remove from Blip history?",
                    message: "Files already on disk are kept.",
                    primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
                  });
                  if (confirmed) await run("Removed", () => removeTransfer(row.id, false));
                }}
              />
            )}
            {clearHistoryAction}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter transfers…"
      searchBarAccessory={
        <List.Dropdown tooltip="Direction" onChange={(value) => setFilter(value as typeof filter)}>
          <List.Dropdown.Item title="All Transfers" value="all" />
          <List.Dropdown.Item title="Incoming" value="incoming" />
          <List.Dropdown.Item title="Outgoing" value="outgoing" />
        </List.Dropdown>
      }
    >
      <List.Section title="Waiting for You">{waiting.map(renderRow)}</List.Section>
      <List.Section title="In Progress">{inProgress.map(renderRow)}</List.Section>
      <List.Section title="History">{done.map(renderRow)}</List.Section>
      {!isLoading && filtered.length === 0 && <List.EmptyView icon={Icon.Tray} title="No transfers yet" />}
    </List>
  );
}
