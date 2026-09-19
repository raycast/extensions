import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { dispatch } from "../blip/client";
import type { BlipState } from "../blip/client";
import {
  compactTime,
  formatBytes,
  formatBytesColumn,
  formatSpeed,
  padCentred,
  padColumn,
  pluralize,
  relativeTime,
  truncate,
} from "../blip/format";
import { defaultSavePath, isSignedIn, receivedItemPaths, statusLabel, transfers } from "../blip/model";
import type { TransferView } from "../blip/model";
import { useBlipState } from "../hooks/useBlipState";
import { BlipUnavailable, NotSignedIn } from "./BlipUnavailable";
import { statusColor, transferIcon } from "./icons";

interface Props {
  /** Transfer to select when the list opens (used right after sending). */
  focusId?: string;
  navigationTitle?: string;
}

interface Preferences {
  savePath?: string;
}

const RECENT_LIMIT = 40;
const STATUS_WIDTH = 8;
const TIME_WIDTH = 5;
const PEER_WIDTH = 26;

export function TransfersList({ focusId, navigationTitle }: Props) {
  const { state, isLoading, unavailable, refresh } = useBlipState();
  const [showDetail, setShowDetail] = useState(false);

  if (unavailable && !state)
    return <BlipUnavailable onReady={refresh} navigationTitle={navigationTitle ?? "Blip Transfers"} />;
  if (state && !isSignedIn(state)) return <NotSignedIn />;

  const all = state ? transfers(state) : [];
  const attention = all.filter((t) => t.needsAcceptance);
  const active = all.filter((t) => t.active && !t.needsAcceptance);
  const recent = all.filter((t) => !t.active).slice(0, RECENT_LIMIT);

  const common = { state: state as BlipState, showDetail, onToggleDetail: () => setShowDetail((v) => !v), refresh };

  return (
    <List
      isLoading={isLoading}
      navigationTitle={navigationTitle ?? "Blip Transfers"}
      searchBarPlaceholder="Search transfers by file or person"
      isShowingDetail={showDetail && all.length > 0}
      selectedItemId={focusId}
    >
      <List.EmptyView
        icon={Icon.Tray}
        title="No transfers yet"
        description="Files you send or receive with Blip will show up here."
      />
      <List.Section title="Needs Your Attention" subtitle={attention.length ? String(attention.length) : undefined}>
        {attention.map((t) => (
          <TransferItem key={t.id} view={t} {...common} />
        ))}
      </List.Section>
      <List.Section title="In Progress" subtitle={active.length ? String(active.length) : undefined}>
        {active.map((t) => (
          <TransferItem key={t.id} view={t} {...common} />
        ))}
      </List.Section>
      <List.Section title="Recent">
        {recent.map((t) => (
          <TransferItem key={t.id} view={t} {...common} />
        ))}
      </List.Section>
    </List>
  );
}

function TransferItem({
  view,
  state,
  showDetail,
  onToggleDetail,
  refresh,
}: {
  view: TransferView;
  state: BlipState;
  showDetail: boolean;
  onToggleDetail: () => void;
  refresh: () => Promise<void>;
}) {
  const direction = view.incoming ? "from" : "to";
  const accessories: List.Item.Accessory[] = [];
  if (!showDetail) {
    // Each accessory is padded to a fixed character width so the values line up in columns.
    accessories.push({
      text: `${direction} ${truncate(view.peerName, PEER_WIDTH)}`,
      tooltip: `${view.incoming ? "From" : "To"} ${view.peerName}`,
    });
    if (view.status === "Active" || view.status === "Paused" || view.status === "ResumeRequested") {
      const speed = view.status === "Active" ? formatSpeed(view.transfer.stats?.kbps) : undefined;
      accessories.push({
        text: `${formatBytes(view.transferredBytes)} of ${formatBytes(view.totalBytes)}${speed ? ` · ${speed}` : ""}`,
      });
    } else {
      accessories.push({ text: formatBytesColumn(view.totalBytes), tooltip: formatBytes(view.totalBytes) });
    }
    accessories.push({
      tag: { value: padCentred(statusLabel(view), STATUS_WIDTH), color: statusColor(view) },
      tooltip: view.error,
    });
    accessories.push({
      text: padColumn(view.active ? "" : compactTime(view.updatedAt), TIME_WIDTH),
      tooltip: view.updatedAt?.toLocaleString(),
    });
  }

  return (
    <List.Item
      id={view.id}
      title={view.title}
      subtitle={showDetail ? `${direction} ${view.peerName}` : undefined}
      icon={transferIcon(view)}
      keywords={[view.peerName, ...view.itemNames]}
      accessories={accessories}
      detail={showDetail ? <TransferDetail view={view} /> : undefined}
      actions={<TransferActions view={view} state={state} onToggleDetail={onToggleDetail} refresh={refresh} />}
    />
  );
}

function TransferDetail({ view }: { view: TransferView }) {
  const stats = view.transfer.stats;
  const speed = formatSpeed(stats?.kbps);
  const route = stats?.is_relayed
    ? "Relayed"
    : stats?.is_wan
      ? "Internet"
      : stats?.is_wan === false
        ? "Local network"
        : undefined;
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item text={statusLabel(view)} color={statusColor(view)} />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label title={view.incoming ? "From" : "To"} text={view.peerName} />
          <List.Item.Detail.Metadata.Label
            title="Size"
            text={
              view.status === "Active"
                ? `${formatBytes(view.transferredBytes)} of ${formatBytes(view.totalBytes)}`
                : formatBytes(view.totalBytes)
            }
          />
          {speed && <List.Item.Detail.Metadata.Label title="Speed" text={speed} />}
          {route && <List.Item.Detail.Metadata.Label title="Route" text={route} />}
          {stats?.is_end_to_end_encrypted && (
            <List.Item.Detail.Metadata.Label
              title="Encryption"
              text="End to end"
              icon={{ source: Icon.Lock, tintColor: Color.Green }}
            />
          )}
          {view.error && (
            <List.Item.Detail.Metadata.Label
              title="Problem"
              text={view.error}
              icon={{ source: Icon.Warning, tintColor: Color.Red }}
            />
          )}
          {view.savePath && <List.Item.Detail.Metadata.Label title="Saved to" text={view.savePath} />}
          {view.updatedAt && (
            <List.Item.Detail.Metadata.Label title="Updated" text={`${relativeTime(view.updatedAt)}`} />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title={pluralize(view.itemNames.length, "Item")} />
          {view.itemNames.slice(0, 30).map((name) => {
            const item = view.transfer.archive_stub?.items?.[name];
            const size = item?.file?.size ?? item?.folder_stub?.size;
            const icon = item?.folder || item?.folder_stub ? Icon.Folder : Icon.Document;
            return (
              <List.Item.Detail.Metadata.Label
                key={name}
                title={name}
                text={size !== undefined ? formatBytes(size) : ""}
                icon={icon}
              />
            );
          })}
          {view.itemNames.length > 30 && (
            <List.Item.Detail.Metadata.Label title={`and ${view.itemNames.length - 30} more`} />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function TransferActions({
  view,
  state,
  onToggleDetail,
  refresh,
}: {
  view: TransferView;
  state: BlipState;
  onToggleDetail: () => void;
  refresh: () => Promise<void>;
}) {
  const id = view.id;
  const received = view.incoming && view.status === "Completed" ? receivedItemPaths(view) : [];
  const sourcePaths = !view.incoming
    ? Object.values(view.transfer.archive_stub?.disk_locations ?? {}).filter((p) => p.startsWith("/"))
    : [];

  async function run(title: string, action: () => Promise<void>, success?: string) {
    try {
      await action();
      await refresh();
      if (success) await showToast({ style: Toast.Style.Success, title: success });
    } catch (error) {
      await showFailureToast(error, { title });
    }
  }

  const accept = () => {
    const savePath = defaultSavePath(state, getPreferenceValues<Preferences>().savePath);
    return run(
      "Could not accept",
      () => dispatch("TransferAcceptanceRequested", { transfer_id: id, save_path: savePath }),
      `Saving to ${savePath}`,
    );
  };

  const remove = async () => {
    const deleteFiles =
      view.incoming &&
      view.status === "Completed" &&
      (await confirmAlert({
        title: "Remove transfer and delete the received files?",
        message: "Choose Keep Files to remove only the record.",
        primaryAction: { title: "Delete Files", style: Alert.ActionStyle.Destructive },
        dismissAction: { title: "Keep Files" },
      }));
    await run(
      "Could not remove",
      () => dispatch("TransferRemoveRequested", { transfer_id: id, delete_files: deleteFiles }),
      "Transfer removed",
    );
  };

  const finderActions = (
    <>
      {received.length > 0 && (
        <Action.ShowInFinder
          title={received.length === 1 ? "Show in Finder" : "Show Files in Finder"}
          path={received[0]}
        />
      )}
      {received.length === 1 && <Action.Open title="Open File" target={received[0]} />}
      {received.length === 0 && view.savePath && view.status === "Completed" && (
        <Action.ShowInFinder title="Show Save Folder" path={view.savePath} />
      )}
      {sourcePaths.length > 0 && <Action.ShowInFinder title="Show Source in Finder" path={sourcePaths[0]} />}
    </>
  );

  const transferActions = (
    <>
      {view.needsAcceptance && <Action title="Accept" icon={Icon.Download} onAction={accept} />}
      {view.needsAcceptance && (
        <Action
          title="Decline"
          icon={Icon.XMarkCircle}
          style={Action.Style.Destructive}
          onAction={() =>
            run("Could not decline", () => dispatch("TransferDeclineRequested", { transfer_id: id }), "Declined")
          }
        />
      )}
      {view.status === "Active" && (
        <Action
          title="Pause"
          icon={Icon.Pause}
          onAction={() => run("Could not pause", () => dispatch("TransferPauseRequested", { transfer_id: id }))}
        />
      )}
      {view.status === "Paused" && (
        <Action
          title="Resume"
          icon={Icon.Play}
          onAction={() => run("Could not resume", () => dispatch("TransferResume", { transfer_id: id }))}
        />
      )}
      {view.active && !view.needsAcceptance && (
        <Action
          title="Cancel Transfer"
          icon={Icon.Stop}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "c" }}
          onAction={() =>
            run(
              "Could not cancel",
              () => dispatch("TransferCancellationRequested", { transfer_id: id }),
              "Transfer cancelled",
            )
          }
        />
      )}
    </>
  );

  return (
    <ActionPanel title={view.title}>
      <ActionPanel.Section>
        {view.active ? transferActions : finderActions}
        {view.active ? finderActions : transferActions}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Toggle Details"
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={onToggleDetail}
        />
        {view.itemNames.length > 0 && (
          <Action.CopyToClipboard title="Copy File Names" content={view.itemNames.join("\n")} />
        )}
        <Action.Open
          title="Open Blip"
          target="/Applications/Blip.app"
          icon={Icon.Bolt}
          shortcut={{ modifiers: ["cmd"], key: "b" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {!view.active && !view.transfer.is_dismissed && (
          <Action
            title="Hide from Blip's List"
            icon={Icon.EyeDisabled}
            onAction={() => run("Could not hide", () => dispatch("TransferDismiss", { transfer_id: id }))}
          />
        )}
        {!view.active && (
          <Action
            title="Remove Transfer"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={remove}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
