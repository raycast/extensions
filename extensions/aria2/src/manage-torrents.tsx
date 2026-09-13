import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Keyboard,
  List,
  confirmAlert,
  openExtensionPreferences,
  useNavigation,
} from "@raycast/api";
import { getProgressIcon, showFailureToast, usePromise, type MutatePromise } from "@raycast/utils";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AddTorrentForm } from "./add-torrent";
import {
  type Aria2Download,
  type TorrentGroup,
  classify,
  ensureAria2,
  isConnectionError,
  listDownloads,
  magnetUri,
  pause,
  pauseAll,
  purgeCompleted,
  removeTorrent,
  resume,
  resumeAll,
  revealPath,
  startDaemon,
  torrentName,
} from "./lib/aria2";
import { formatBytes, formatEta, formatPercent, formatRatio, formatSpeed, toNumber } from "./lib/format";

type PushView = (node: ReactNode) => void;
type PopView = () => void;
type MutateDownloads = MutatePromise<Aria2Download[], undefined>;

const SECTIONS: { id: TorrentGroup; title: string }[] = [
  { id: "downloading", title: "Downloading" },
  { id: "seeding", title: "Seeding" },
  { id: "queued", title: "Queued" },
  { id: "paused", title: "Paused" },
  { id: "complete", title: "Completed" },
  { id: "error", title: "Error" },
];

export default function Command() {
  const [filter, setFilter] = useState<TorrentGroup | "all">("all");
  const { push, pop } = useNavigation();

  const { data, isLoading, error, revalidate, mutate } = usePromise(
    async () => {
      await ensureAria2();
      return listDownloads();
    },
    [],
    {
      onError: (err) => {
        if (!isConnectionError(err)) {
          showFailureToast(err, { title: "aria2 error" });
        }
      },
    },
  );

  useEffect(() => {
    if (error && !data) return;
    const id = setInterval(() => revalidate(), 2000);
    return () => clearInterval(id);
  }, [error, data, revalidate]);

  const grouped = useMemo(() => {
    const downloads = data ?? [];
    const groups: Record<TorrentGroup, Aria2Download[]> = {
      downloading: [],
      seeding: [],
      queued: [],
      paused: [],
      complete: [],
      error: [],
    };
    for (const download of downloads) {
      groups[classify(download)].push(download);
    }
    return groups;
  }, [data]);

  const visible = SECTIONS.filter((section) =>
    filter === "all" ? grouped[section.id].length > 0 : section.id === filter,
  );
  const disconnected = Boolean(error && isConnectionError(error) && !data);

  return (
    <List
      isLoading={isLoading && !data}
      isShowingDetail={!disconnected && (data?.length ?? 0) > 0}
      searchBarPlaceholder="Search torrents"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" value={filter} onChange={(value) => setFilter(value as TorrentGroup | "all")}>
          <List.Dropdown.Item title="All" value="all" />
          {SECTIONS.map((section) => (
            <List.Dropdown.Item key={section.id} title={section.title} value={section.id} />
          ))}
        </List.Dropdown>
      }
    >
      {disconnected ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Can't reach aria2"
          description={error instanceof Error ? error.message : "Start aria2c with RPC enabled."}
          actions={
            <ActionPanel>
              <Action
                title="Start Aria2"
                icon={Icon.Play}
                onAction={async () => {
                  try {
                    await startDaemon();
                    await revalidate();
                  } catch (err) {
                    await showFailureToast(err, { title: "Couldn't start aria2c" });
                  }
                }}
              />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (data?.length ?? 0) === 0 ? (
        <List.EmptyView
          icon={Icon.Download}
          title="No torrents"
          description="Add a magnet link or torrent file to get started."
          actions={<ActionPanel>{listActions(push, pop, revalidate, mutate)}</ActionPanel>}
        />
      ) : (
        visible.map((section) => (
          <List.Section key={section.id} title={section.title} subtitle={String(grouped[section.id].length)}>
            {grouped[section.id].map((download) => (
              <TorrentItem
                key={download.gid}
                download={download}
                group={section.id}
                push={push}
                pop={pop}
                revalidate={revalidate}
                mutate={mutate}
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}

function TorrentItem({
  download,
  group,
  push,
  pop,
  revalidate,
  mutate,
}: {
  download: Aria2Download;
  group: TorrentGroup;
  push: PushView;
  pop: PopView;
  revalidate: () => void;
  mutate: MutateDownloads;
}) {
  const name = torrentName(download);
  const total = toNumber(download.totalLength);
  const done = toNumber(download.completedLength);
  const downSpeed = toNumber(download.downloadSpeed);
  const upSpeed = toNumber(download.uploadSpeed);
  const progress = total > 0 ? Math.min(1, done / total) : 0;
  const path = revealPath(download);
  const magnet = magnetUri(download);

  return (
    <List.Item
      title={name}
      icon={statusIcon(group, progress)}
      accessories={accessories(group, download, progress)}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Status" text={statusLabel(group, download)} />
              <List.Item.Detail.Metadata.Label title="Progress" text={formatPercent(done, total)} />
              <List.Item.Detail.Metadata.Label title="Size" text={`${formatBytes(done)} / ${formatBytes(total)}`} />
              <List.Item.Detail.Metadata.Label
                title="Uploaded"
                text={`${formatBytes(toNumber(download.uploadLength))}  ·  ratio ${formatRatio(toNumber(download.uploadLength), done)}`}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Download" text={formatSpeed(downSpeed)} />
              <List.Item.Detail.Metadata.Label title="Upload" text={formatSpeed(upSpeed)} />
              {group === "downloading" ? (
                <List.Item.Detail.Metadata.Label title="ETA" text={formatEta(done, total, downSpeed)} />
              ) : null}
              <List.Item.Detail.Metadata.Label
                title="Peers"
                text={`${download.connections ?? "0"} connections${download.numSeeders ? `  ·  ${download.numSeeders} seeders` : ""}`}
              />
              <List.Item.Detail.Metadata.Separator />
              {path ? <List.Item.Detail.Metadata.Label title="Location" text={path} /> : null}
              {download.infoHash ? (
                <List.Item.Detail.Metadata.Label title="Info Hash" text={download.infoHash} />
              ) : null}
              {download.errorMessage ? (
                <List.Item.Detail.Metadata.Label
                  title="Error"
                  text={{ value: download.errorMessage, color: Color.Red }}
                />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {group === "paused" || group === "queued" ? (
            <Action
              title="Resume"
              icon={Icon.Play}
              onAction={() => runAction(() => mutate(resume(download.gid)), "Couldn't resume")}
            />
          ) : null}
          {group === "downloading" || group === "seeding" || group === "queued" ? (
            <Action
              title="Pause"
              icon={Icon.Pause}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onAction={() => runAction(() => mutate(pause(download.gid)), "Couldn't pause")}
            />
          ) : null}
          {path ? <Action.ShowInFinder title="Show in Finder" path={path} /> : null}
          {magnet ? <Action.CopyToClipboard title="Copy Magnet Link" content={magnet} /> : null}
          {download.infoHash ? <Action.CopyToClipboard title="Copy Info Hash" content={download.infoHash} /> : null}
          <Action
            title="Remove"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={() => confirmRemove(download, false, mutate)}
          />
          <Action
            title="Remove and Delete Files"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
            onAction={() => confirmRemove(download, true, mutate)}
          />
          {listActions(push, pop, revalidate, mutate)}
        </ActionPanel>
      }
    />
  );
}

function listActions(push: PushView, pop: PopView, revalidate: () => void, mutate: MutateDownloads) {
  return (
    <ActionPanel.Section>
      <Action
        title="Add Torrent"
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        onAction={() =>
          push(
            <AddTorrentForm
              onAdded={() => {
                pop();
                revalidate();
              }}
            />,
          )
        }
      />
      <Action
        title="Pause All"
        icon={Icon.Pause}
        onAction={() => runAction(() => mutate(pauseAll()), "Couldn't pause")}
      />
      <Action
        title="Resume All"
        icon={Icon.Play}
        onAction={() => runAction(() => mutate(resumeAll()), "Couldn't resume")}
      />
      <Action
        title="Clear Completed"
        icon={Icon.Tray}
        onAction={() => runAction(() => mutate(purgeCompleted()), "Couldn't clear completed")}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel.Section>
  );
}

async function confirmRemove(download: Aria2Download, deleteFiles: boolean, mutate: MutateDownloads) {
  const confirmed = await confirmAlert({
    title: deleteFiles ? "Remove and delete files?" : "Remove torrent?",
    message: deleteFiles
      ? `${torrentName(download)} will be removed from aria2 and moved to Trash.`
      : `${torrentName(download)} will be removed from aria2. Downloaded files are kept.`,
    primaryAction: { title: deleteFiles ? "Delete" : "Remove", style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed) return;
  await runAction(() => mutate(removeTorrent(download.gid, deleteFiles, download)), "Couldn't remove torrent");
}

async function runAction(action: () => Promise<unknown>, title: string) {
  try {
    await action();
  } catch (error) {
    await showFailureToast(error, { title });
  }
}

function statusIcon(group: TorrentGroup, progress: number) {
  switch (group) {
    case "downloading":
      return getProgressIcon(progress, Color.Blue);
    case "seeding":
      return getProgressIcon(1, Color.Green);
    case "paused":
      return getProgressIcon(progress, Color.SecondaryText);
    case "queued":
      return Icon.Clock;
    case "error":
      return { source: Icon.Warning, tintColor: Color.Red };
    case "complete":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
  }
}

function accessories(group: TorrentGroup, download: Aria2Download, progress: number) {
  const downSpeed = toNumber(download.downloadSpeed);
  const upSpeed = toNumber(download.uploadSpeed);
  if (group === "downloading") {
    return [
      { text: formatPercent(toNumber(download.completedLength), toNumber(download.totalLength)) },
      { text: formatSpeed(downSpeed) },
    ];
  }
  if (group === "seeding") {
    return [{ tag: { value: "Seeding", color: Color.Green } }, { text: formatSpeed(upSpeed) }];
  }
  if (group === "error") {
    return [{ tag: { value: "Error", color: Color.Red } }];
  }
  if (group === "paused") {
    return [
      { tag: { value: "Paused", color: Color.SecondaryText } },
      { text: formatPercent(toNumber(download.completedLength), toNumber(download.totalLength)) },
    ];
  }
  if (group === "complete") {
    return [{ tag: { value: "Done", color: Color.Green } }];
  }
  return [{ text: `${Math.round(progress * 100)}%` }];
}

function statusLabel(group: TorrentGroup, download: Aria2Download) {
  switch (group) {
    case "downloading":
      return { value: "Downloading", color: Color.Blue };
    case "seeding":
      return { value: "Seeding", color: Color.Green };
    case "queued":
      return { value: "Queued", color: Color.SecondaryText };
    case "paused":
      return { value: "Paused", color: Color.SecondaryText };
    case "complete":
      return { value: "Completed", color: Color.Green };
    case "error":
      return { value: download.errorMessage || "Error", color: Color.Red };
  }
}
