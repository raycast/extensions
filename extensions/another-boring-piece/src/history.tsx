import fs from "fs";
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  environment,
  Icon,
  Image,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { DownloadWallpaperAction, SetWallpaperAction } from "./actions";
import { buildWallpaperMarkdown, getThumbnailUrl } from "./utils";
import {
  clearWallpaperHistory,
  deleteWallpaperHistoryEntry,
  readWallpaperHistory,
  WallpaperHistoryEntry,
} from "./history-store";

const HISTORY_LIMIT = 500;

type HistoryListEntry = WallpaperHistoryEntry & {
  downloadFileExists: boolean;
};

async function loadHistory() {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  return readWallpaperHistory({ limit: HISTORY_LIMIT }).map((entry) => ({
    ...entry,
    downloadFileExists: entry.downloadPath
      ? fs.existsSync(entry.downloadPath)
      : false,
  }));
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatEventType(entry: WallpaperHistoryEntry) {
  switch (entry.eventType) {
    case "selected":
      return "Selected";
    case "downloaded":
      return "Downloaded";
    case "auto-switched":
      return "Auto-switched";
  }
}

function getArtworkUrl(entry: WallpaperHistoryEntry) {
  return (
    entry.wallpaper.websiteUrl ||
    `https://anotherboring.day/art/${entry.wallpaper.id}`
  );
}

function buildHistoryMarkdown(entry: WallpaperHistoryEntry) {
  return buildWallpaperMarkdown(
    entry.wallpaper,
    `

---

**${formatEventType(entry)}** on ${formatTimestamp(entry.timestamp)}
`,
  );
}

function HistoryActions(props: {
  entry: HistoryListEntry;
  historyCount: number;
  onHistoryChanged: () => Promise<void>;
}) {
  const { entry, historyCount, onHistoryChanged } = props;

  return (
    <ActionPanel>
      <SetWallpaperAction wallpaper={entry.wallpaper} />
      <ActionPanel.Section>
        <DownloadWallpaperAction wallpaper={entry.wallpaper} />
        <Action.OpenInBrowser
          title="Open Artwork Page"
          url={getArtworkUrl(entry)}
          shortcut={Keyboard.Shortcut.Common.Open}
        />
        <Action.Open
          title="Open Extension Folder"
          icon={Icon.Folder}
          target={environment.supportPath}
        />
        {entry.downloadFileExists && entry.downloadPath ? (
          <Action.ShowInFinder
            title="Show Download in Finder"
            path={entry.downloadPath}
          />
        ) : null}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Delete from History"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={async () => {
            const confirmed = await confirmAlert({
              title: "Delete this history item?",
              message: `Remove "${entry.wallpaper.name}" from your wallpaper history.`,
              primaryAction: {
                title: "Delete",
                style: Alert.ActionStyle.Destructive,
              },
            });
            if (!confirmed) return;

            try {
              const deleted = deleteWallpaperHistoryEntry(entry.eventId);
              await onHistoryChanged();
              await showToast({
                style: deleted ? Toast.Style.Success : Toast.Style.Failure,
                title: deleted
                  ? "History item deleted"
                  : "History item not found",
              });
            } catch (error) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Failed to delete history item",
                message: error instanceof Error ? error.message : String(error),
              });
            }
          }}
        />
        {historyCount > 0 ? (
          <Action
            title="Delete All History"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.RemoveAll}
            onAction={async () => {
              const confirmed = await confirmAlert({
                title: "Delete all history?",
                message:
                  "This removes all wallpaper history entries. Downloaded wallpaper files will not be deleted.",
                primaryAction: {
                  title: "Delete All",
                  style: Alert.ActionStyle.Destructive,
                },
              });
              if (!confirmed) return;

              try {
                const deletedCount = clearWallpaperHistory();
                await onHistoryChanged();
                await showToast({
                  style: Toast.Style.Success,
                  title: "History deleted",
                  message: `${deletedCount} entries removed`,
                });
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to delete history",
                  message:
                    error instanceof Error ? error.message : String(error),
                });
              }
            }}
          />
        ) : null}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export default function Command() {
  const [history, setHistory] = useState<HistoryListEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshHistory() {
    setIsLoading(true);
    try {
      const entries = await loadHistory();
      setHistory(entries);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const entries = await loadHistory();
        if (isMounted) setHistory(entries);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Wallpaper History"
      searchBarPlaceholder="Search history by title, artist, year, or action..."
    >
      {history.length === 0 ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No wallpaper history yet"
          description="Set or download a wallpaper to see it here."
        />
      ) : (
        history.map((entry) => {
          return (
            <List.Item
              key={entry.eventId}
              id={entry.eventId}
              title={`${entry.wallpaper.name} by ${entry.wallpaper.artist}`}
              subtitle={formatEventType(entry)}
              keywords={[
                entry.wallpaper.name,
                entry.wallpaper.artist,
                entry.wallpaper.creationDate,
                entry.eventType,
              ]}
              icon={{
                source: getThumbnailUrl(entry.wallpaper.url, { width: 100 }),
                mask: Image.Mask.RoundedRectangle,
              }}
              detail={
                <List.Item.Detail markdown={buildHistoryMarkdown(entry)} />
              }
              actions={
                <HistoryActions
                  entry={entry}
                  historyCount={history.length}
                  onHistoryChanged={refreshHistory}
                />
              }
            />
          );
        })
      )}
    </List>
  );
}
