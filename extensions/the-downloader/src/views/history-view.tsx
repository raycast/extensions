import { useEffect, useMemo, useState } from "react";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Icon,
  Image,
  Keyboard,
  LaunchType,
  List,
  Toast,
  confirmAlert,
  launchCommand,
  open,
  showHUD,
  showToast,
} from "@raycast/api";
import { CARD_W, historyCardSvg } from "../lib/charts.js";
import { formatBytes, formatClock, plural } from "../lib/format.js";
import {
  HistoryEntry,
  HistoryFilter,
  clearHistory,
  groupByDay,
  loadHistory,
  matchesFilter,
  removeFromHistory,
} from "../lib/history.js";
import { KIND_COLOR, KIND_ICON, hostOf, itemNoun, kindTitle, safeImageUrl } from "../lib/kinds.js";
import { markdownImage } from "../lib/svg.js";

const FILTERS: { value: HistoryFilter; title: string; icon: Icon }[] = [
  { value: "all", title: "All Downloads", icon: Icon.Download },
  { value: "video", title: "Videos", icon: Icon.Video },
  { value: "audio", title: "Audio", icon: Icon.Music },
  { value: "images", title: "Images & Galleries", icon: Icon.Image },
  { value: "spotify", title: "Spotify", icon: Icon.Music },
  { value: "website", title: "Webpages", icon: Icon.Globe },
  { value: "transcript", title: "Transcripts", icon: Icon.Document },
  { value: "failed", title: "Failed", icon: Icon.XMarkCircle },
];

/** Opens the history from the Download form and the live view. */
export const HISTORY_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "h" },
  Windows: { modifiers: ["ctrl", "shift"], key: "h" },
};

const toggleDetailsShortcut: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "d" },
  Windows: { modifiers: ["ctrl", "shift"], key: "d" },
};

function tildify(p: string): string {
  const home = os.homedir();
  return p.startsWith(home) ? `~${p.slice(home.length)}` : p;
}

function titleOf(e: HistoryEntry): string {
  if (e.title) return e.title;
  if (e.filePath) return path.basename(e.filePath, path.extname(e.filePath));
  return hostOf(e.url);
}

function sizeText(e: HistoryEntry): string | undefined {
  if (e.items) return plural(e.items, itemNoun(e.kind));
  return e.bytes !== undefined ? formatBytes(e.bytes) : undefined;
}

function iconOf(e: HistoryEntry): Image.ImageLike {
  if (e.status === "failed") return { source: Icon.XMarkCircle, tintColor: Color.Red };
  const thumbnail = safeImageUrl(e.thumbnail);
  return thumbnail
    ? { source: thumbnail, mask: Image.Mask.RoundedRectangle, fallback: KIND_ICON[e.kind] }
    : { source: KIND_ICON[e.kind], tintColor: KIND_COLOR[e.kind] };
}

function badgeOf(e: HistoryEntry): { badge: string; caption?: string } {
  if (e.items) return { badge: String(e.items), caption: `${itemNoun(e.kind)}s` };
  const ext = e.filePath ? path.extname(e.filePath).slice(1).toUpperCase() : "";
  return { badge: ext || kindTitle(e.kind).toUpperCase().slice(0, 5) };
}

function whenText(e: HistoryEntry): string {
  return new Date(e.finishedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function detailMarkdown(e: HistoryEntry): string {
  // A run of backticks inside the tool's error would close the code fence early.
  const error =
    e.status === "failed" && e.error ? `\n\n\`\`\`\n${e.error.slice(0, 1200).replace(/`{3,}/g, "` ` `")}\n\`\`\`` : "";
  const thumbnail = safeImageUrl(e.thumbnail);
  if (thumbnail) {
    return `![${titleOf(e).replace(/[[\]]/g, "")}](${thumbnail})\n\n### ${titleOf(e)}${error}`;
  }
  const { badge, caption } = badgeOf(e);
  const lines = [
    [kindTitle(e.kind), sizeText(e)].filter(Boolean).join(" · "),
    e.status === "failed" ? "Failed" : `Saved ${whenText(e)}`,
  ];
  const card = historyCardSvg({
    kind: e.kind,
    status: e.status,
    title: titleOf(e),
    badge,
    badgeCaption: caption,
    lines,
  });
  return `${markdownImage(card, `card-${e.id}`, CARD_W)}${error}`;
}

async function downloadAgain(url: string) {
  try {
    await launchCommand({ name: "index", type: LaunchType.UserInitiated, context: { url } });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open the Download command",
      message: error instanceof Error ? error.message : undefined,
    });
  }
}

/**
 * Everything downloaded with The Downloader, newest first and grouped by day.
 * Also opened from the Download form and the live download view.
 */
export function DownloadHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>();
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [showingDetail, setShowingDetail] = useState(true);

  useEffect(() => {
    loadHistory().then(setEntries);
  }, []);

  // Files can be moved or deleted after the download; check once per load.
  const exists = useMemo(
    () => new Map((entries ?? []).map((e) => [e.id, e.filePath ? fs.existsSync(e.filePath) : undefined])),
    [entries],
  );

  const visible = (entries ?? []).filter((e) => matchesFilter(e, filter));
  const groups = groupByDay(visible);

  async function remove(entry: HistoryEntry) {
    setEntries(await removeFromHistory(entry.id));
    await showToast({ style: Toast.Style.Success, title: "Removed from History" });
  }

  async function clearAll() {
    const confirmed = await confirmAlert({
      title: "Clear Download History?",
      message: "Downloaded files stay where they are; only the list is cleared.",
      icon: Icon.Trash,
      primaryAction: { title: "Clear History", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) setEntries(await clearHistory());
  }

  const newDownload = (
    <Action
      title="New Download"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      onAction={() => launchCommand({ name: "index", type: LaunchType.UserInitiated })}
    />
  );

  return (
    <List
      isLoading={entries === undefined}
      isShowingDetail={showingDetail && visible.length > 0}
      navigationTitle="Download History"
      searchBarPlaceholder="Search downloads by title, channel or site"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" storeValue onChange={(value) => setFilter(value as HistoryFilter)}>
          {FILTERS.map((f) => (
            <List.Dropdown.Item key={f.value} value={f.value} title={f.title} icon={f.icon} />
          ))}
        </List.Dropdown>
      }
    >
      {entries?.length === 0 && (
        <List.EmptyView
          icon={Icon.Download}
          title="No downloads yet"
          description="Everything you download with The Downloader shows up here."
          actions={<ActionPanel>{newDownload}</ActionPanel>}
        />
      )}
      {entries && entries.length > 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No matching downloads"
          description="Try another search or filter."
          actions={<ActionPanel>{newDownload}</ActionPanel>}
        />
      )}
      {groups.map((group) => (
        <List.Section key={group.title} title={group.title} subtitle={plural(group.entries.length, "download")}>
          {group.entries.map((e) => {
            const fileExists = exists.get(e.id);
            const filePath = e.filePath && fileExists ? e.filePath : undefined;
            const size = sizeText(e);
            const took = e.finishedAt > e.startedAt ? formatClock((e.finishedAt - e.startedAt) / 1000) : undefined;
            return (
              <List.Item
                key={e.id}
                title={titleOf(e)}
                icon={iconOf(e)}
                keywords={[e.uploader, e.source, hostOf(e.url), e.format, kindTitle(e.kind)].filter((k): k is string =>
                  Boolean(k),
                )}
                accessories={[
                  ...(e.status === "failed" ? [{ tag: { value: "Failed", color: Color.Red } }] : []),
                  ...(fileExists === false ? [{ tag: { value: "Missing", color: Color.Orange } }] : []),
                  ...(size ? [{ text: size }] : []),
                  { tag: { value: kindTitle(e.kind), color: KIND_COLOR[e.kind] } },
                  { date: new Date(e.finishedAt), tooltip: whenText(e) },
                ]}
                detail={
                  <List.Item.Detail
                    markdown={detailMarkdown(e)}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label
                          title="Status"
                          text={
                            e.status === "failed" ? "Failed" : fileExists === false ? "File moved or deleted" : "Saved"
                          }
                          icon={
                            e.status === "failed"
                              ? { source: Icon.XMarkCircle, tintColor: Color.Red }
                              : fileExists === false
                                ? { source: Icon.QuestionMarkCircle, tintColor: Color.Orange }
                                : { source: Icon.CheckCircle, tintColor: Color.Green }
                          }
                        />
                        <List.Item.Detail.Metadata.TagList title="Type">
                          <List.Item.Detail.Metadata.TagList.Item
                            text={kindTitle(e.kind)}
                            color={KIND_COLOR[e.kind]}
                            icon={KIND_ICON[e.kind]}
                          />
                        </List.Item.Detail.Metadata.TagList>
                        {e.uploader && <List.Item.Detail.Metadata.Label title="Channel" text={e.uploader} />}
                        {e.duration ? (
                          <List.Item.Detail.Metadata.Label title="Duration" text={formatClock(e.duration)} />
                        ) : null}
                        <List.Item.Detail.Metadata.Label title="Source" text={e.source ?? hostOf(e.url)} />
                        {e.format && <List.Item.Detail.Metadata.Label title="Format" text={e.format} />}
                        {size && <List.Item.Detail.Metadata.Label title={e.items ? "Saved" : "Size"} text={size} />}
                        {took && <List.Item.Detail.Metadata.Label title="Took" text={took} />}
                        <List.Item.Detail.Metadata.Label title="Finished" text={whenText(e)} />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Folder" text={tildify(e.folder)} icon={Icon.Folder} />
                        {e.filePath && (
                          <List.Item.Detail.Metadata.Label
                            title="File"
                            text={path.basename(e.filePath)}
                            icon={fileExists ? Icon.Document : Icon.QuestionMarkCircle}
                          />
                        )}
                        <List.Item.Detail.Metadata.Link title="Original" text={hostOf(e.url)} target={e.url} />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      {filePath ? (
                        <>
                          <Action title="Open File" icon={Icon.Play} onAction={() => open(filePath)} />
                          <Action.ShowInFinder path={filePath} />
                        </>
                      ) : e.status === "done" && !e.filePath ? (
                        <Action title="Open Folder" icon={Icon.Folder} onAction={() => open(e.folder)} />
                      ) : null}
                      <Action
                        title="Download Again"
                        icon={Icon.Download}
                        shortcut={{
                          macOS: { modifiers: ["cmd", "shift"], key: "r" },
                          Windows: { modifiers: ["ctrl", "shift"], key: "r" },
                        }}
                        onAction={() => downloadAgain(e.url)}
                      />
                      <Action
                        title={showingDetail ? "Hide Details" : "Show Details"}
                        icon={showingDetail ? Icon.EyeDisabled : Icon.Eye}
                        shortcut={toggleDetailsShortcut}
                        onAction={() => setShowingDetail((v) => !v)}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      {filePath && (
                        <>
                          <Action
                            title="Copy File"
                            icon={Icon.CopyClipboard}
                            shortcut={Keyboard.Shortcut.Common.Copy}
                            onAction={async () => {
                              await Clipboard.copy({ file: filePath });
                              await showHUD("Copied to Clipboard");
                            }}
                          />
                          <Action.CopyToClipboard
                            title="Copy Path"
                            content={filePath}
                            shortcut={Keyboard.Shortcut.Common.CopyPath}
                          />
                        </>
                      )}
                      <Action.CopyToClipboard title="Copy Original URL" content={e.url} />
                      {e.error && <Action.CopyToClipboard title="Copy Error" content={e.error} />}
                      <Action.OpenInBrowser
                        title="Open Original"
                        url={e.url}
                        shortcut={Keyboard.Shortcut.Common.Open}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      {newDownload}
                      <Action
                        title="Remove from History"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                        onAction={() => remove(e)}
                      />
                      <Action
                        title="Clear History…"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={Keyboard.Shortcut.Common.RemoveAll}
                        onAction={clearAll}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
