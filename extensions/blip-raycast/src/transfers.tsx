import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  List,
  confirmAlert,
  showToast,
  Toast,
} from "@raycast/api";
import { getProgressIcon, showFailureToast } from "@raycast/utils";
import { useMemo, useState } from "react";
import { BlipErrorView } from "./components/BlipErrorView";
import { openablePath, percent, statusColor, TransferActions } from "./components/TransferActions";
import { useBlipState } from "./hooks/useBlipState";
import { removeTransfer } from "./lib/actions";
import { formatBytes, formatSpeed, listTransfers, type TransferRow } from "./lib/model";

type Filter = "all" | "incoming" | "outgoing";

function rowIcon(row: TransferRow) {
  if (row.errorMessage) return { source: Icon.ExclamationMark, tintColor: Color.Red };
  if (row.needsResponse) return { source: Icon.Download, tintColor: Color.Blue };
  if (row.isFinishedOk) return { source: Icon.CheckCircle, tintColor: Color.Green };
  if (!row.isOpen) return { source: Icon.XMarkCircle, tintColor: Color.SecondaryText };
  if (row.isActive && row.fraction !== undefined) return getProgressIcon(row.fraction, Color.Blue);
  if (row.canResume && row.fraction !== undefined) return getProgressIcon(row.fraction, Color.SecondaryText);
  if (row.canResume) return Icon.Pause;
  return row.incoming ? Icon.ArrowDownCircle : Icon.ArrowUpCircle;
}

function accessories(row: TransferRow): List.Item.Accessory[] {
  const result: List.Item.Accessory[] = [];
  if (row.isActive) {
    // The progress icon shows how far along it is; the text adds the exact figure and speed.
    const text = [percent(row), formatSpeed(row.transfer.stats?.kbps)].filter(Boolean).join(" · ");
    if (text) result.push({ text });
  } else if (row.isOpen && !row.needsResponse && row.fraction) {
    // Paused or waiting part-way: how far it got matters when deciding to resume or cancel.
    result.push({ text: `${percent(row)} of ${formatBytes(row.totalBytes)}` });
  } else if (row.totalBytes) {
    result.push({ text: formatBytes(row.totalBytes) });
  }
  // Rows waiting for a response sit under "Waiting for You", so their status needs no tag.
  if (!row.needsResponse) {
    result.push({ tag: { value: row.statusLabel, color: statusColor(row) }, tooltip: row.errorMessage });
  }
  // While active, progress and speed matter more than when it started.
  if (row.updatedAt && !row.isActive) result.push({ date: new Date(row.updatedAt) });
  return result;
}

const emptyTitles: Record<Filter, string> = {
  all: "No Transfers Yet",
  incoming: "No Incoming Transfers",
  outgoing: "No Outgoing Transfers",
};

export default function Command() {
  const { state, error, isLoading } = useBlipState();
  const [filter, setFilter] = useState<Filter>("all");
  const [searchText, setSearchText] = useState("");
  const rows = useMemo(() => (state ? listTransfers(state) : []), [state]);

  if (error && !state) return <BlipErrorView error={error} />;

  const filtered = rows.filter((row) => filter === "all" || (filter === "incoming" ? row.incoming : !row.incoming));
  const waiting = filtered.filter((row) => row.needsResponse);
  const inProgress = filtered.filter((row) => !row.needsResponse && row.isOpen);
  const done = filtered.filter((row) => !row.isOpen);

  const clearHistory = async () => {
    const kind = filter === "all" ? "" : `${filter[0].toUpperCase()}${filter.slice(1)} `;
    const count = `${done.length} Finished ${kind}Transfer${done.length === 1 ? "" : "s"}`;
    const confirmed = await confirmAlert({
      title: `Clear ${done.length === 1 ? "" : "All "}${count}?`,
      message: "They're removed from Blip's history. Files already on disk are kept.",
      primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Clearing History…" });
    try {
      for (const row of done) await removeTransfer(row.id, false);
      toast.style = Toast.Style.Success;
      toast.title = `Cleared ${count}`;
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't Clear History" });
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

  const renderRow = (row: TransferRow) => {
    const path = openablePath(row);
    return (
      <List.Item
        key={row.id}
        icon={rowIcon(row)}
        title={row.title}
        subtitle={`${row.incoming ? "from" : "to"} ${row.peerName}`}
        keywords={[row.peerName, row.statusLabel]}
        accessories={accessories(row)}
        quickLook={path ? { path, name: row.title } : undefined}
        actions={<TransferActions row={row} path={path} extra={clearHistoryAction} />}
      />
    );
  };

  return (
    <List
      isLoading={isLoading}
      filtering={{ keepSectionOrder: true }}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Filter by file, person or status"
      searchBarAccessory={
        <List.Dropdown tooltip="Direction" storeValue onChange={(value) => setFilter(value as Filter)}>
          <List.Dropdown.Item title="All Transfers" value="all" />
          <List.Dropdown.Item title="Incoming" value="incoming" />
          <List.Dropdown.Item title="Outgoing" value="outgoing" />
        </List.Dropdown>
      }
    >
      <List.Section title="Waiting for You">{waiting.map(renderRow)}</List.Section>
      <List.Section title="In Progress">{inProgress.map(renderRow)}</List.Section>
      <List.Section title="History">{done.map(renderRow)}</List.Section>
      {!isLoading &&
        (searchText ? (
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title="No Matching Transfers"
            description="Try a file name, person or status."
          />
        ) : (
          <List.EmptyView
            icon={Icon.Tray}
            title={emptyTitles[filter]}
            description="Files you send or receive with Blip show up here."
            actions={
              <ActionPanel>
                <Action
                  title="Send Something…"
                  icon={Icon.Upload}
                  onAction={() =>
                    launchCommand({ name: "send-to-blip", type: LaunchType.UserInitiated }).catch((error) =>
                      showFailureToast(error, { title: "Couldn't Open the Send Command" }),
                    )
                  }
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
