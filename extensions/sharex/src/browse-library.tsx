import { useState, useEffect } from "react";
import {
  ActionPanel,
  Action,
  Icon,
  Grid,
  getPreferenceValues,
  Toast,
  showToast,
  confirmAlert,
  Alert,
  Clipboard,
  trash,
} from "@raycast/api";
import { homedir } from "os";
import { join } from "path";
import { readdir, stat } from "fs/promises";

interface Preferences {
  screenshotsPath: string;
  folderLimit: string;
  gridColumns: string;
  aspectRatio: string;
}

interface Screenshot {
  path: string;
  name: string;
  folder: string;
  created: number;
}

const ITEMS_PER_PAGE = 100;

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadScreenshots();
  }, []);

  async function loadScreenshots() {
    const prefs = getPreferenceValues<Preferences>();
    const basePath = prefs.screenshotsPath || join(homedir(), "Documents", "ShareX", "Screenshots");
    const limit = parseInt(prefs.folderLimit) || 5;

    try {
      const items = await readdir(basePath);
      const foldersWithStats = await Promise.all(
        items.map(async (item) => {
          const path = join(basePath, item);
          const s = await stat(path);
          return { name: item, path, stat: s };
        }),
      );

      const targetFolders = foldersWithStats
        .filter((f) => f.stat.isDirectory())
        .sort((a, b) => b.stat.birthtimeMs - a.stat.birthtimeMs)
        .slice(0, limit);

      const allScreenshots: Screenshot[] = [];

      for (const { path: folderPath, name: folderName } of targetFolders) {
        const files = await readdir(folderPath);
        for (const file of files) {
          if (/\.(png|jpg|gif|bmp|tif|mp4)$/i.test(file)) {
            const filePath = join(folderPath, file);
            const fileStat = await stat(filePath);
            allScreenshots.push({
              path: filePath,
              name: file,
              folder: folderName,
              created: fileStat.birthtimeMs,
            });
          }
        }
      }

      setScreenshots(allScreenshots);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  async function copyFileToClipboard(filePath: string) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Copying..." });
      await Clipboard.copy({ file: filePath });
      await showToast({ style: Toast.Style.Success, title: "File copied to clipboard" });
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Failed to copy file" });
    }
  }

  async function deleteFile(filePath: string) {
    const confirmed = await confirmAlert({
      title: "Delete Screenshot",
      message: "Are you sure you want to delete this file?",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (confirmed) {
      try {
        await trash(filePath);
        await showToast({ style: Toast.Style.Success, title: "File deleted" });
        await loadScreenshots();
      } catch {
        await showToast({ style: Toast.Style.Failure, title: "Failed to delete file" });
      }
    }
  }

  const groupedScreenshots = screenshots.reduce(
    (acc, screenshot) => {
      if (!acc[screenshot.folder]) {
        acc[screenshot.folder] = [];
      }
      acc[screenshot.folder].push(screenshot);
      return acc;
    },
    {} as Record<string, Screenshot[]>,
  );

  const sortedFolders = Object.entries(groupedScreenshots)
    .map(([folder, items]) => ({
      folder,
      items: items.sort((a, b) => b.created - a.created),
      maxCreated: Math.max(...items.map((i) => i.created)),
    }))
    .sort((a, b) => b.maxCreated - a.maxCreated);

  let displayedItems = 0;
  const foldersToDisplay = [];

  for (const folderData of sortedFolders) {
    if (displayedItems >= displayedCount) break;

    const itemsToShow = folderData.items.slice(0, displayedCount - displayedItems);
    foldersToDisplay.push({
      ...folderData,
      items: itemsToShow,
    });

    displayedItems += itemsToShow.length;
  }

  const hasMore = displayedItems < screenshots.length;

  return (
    <Grid
      columns={parseInt(prefs.gridColumns) || 5}
      aspectRatio={prefs.aspectRatio as "16/9" | "4/3" | "3/2" | "1" | undefined}
      isLoading={isLoading}
      onSelectionChange={(id) => {
        if (hasMore && id && displayedItems > 0) {
          const currentIndex = screenshots.findIndex((s) => s.path === id);
          if (currentIndex > displayedItems - 20) {
            setDisplayedCount((prev) => Math.min(prev + ITEMS_PER_PAGE, screenshots.length));
          }
        }
      }}
    >
      {foldersToDisplay.map(({ folder, items }) => (
        <Grid.Section key={folder} title={folder}>
          {items.map((screenshot) => (
            <Grid.Item
              key={screenshot.path}
              id={screenshot.path}
              content={
                screenshot.path.toLowerCase().endsWith(".mp4")
                  ? { source: Icon.PlayFilled }
                  : { source: screenshot.path }
              }
              title={screenshot.name}
              actions={
                <ActionPanel>
                  <Action.Open title="Open" target={screenshot.path} />
                  <Action.ShowInFinder path={screenshot.path} shortcut={{ modifiers: ["ctrl"], key: "enter" }} />
                  <Action
                    title="Copy File"
                    icon={Icon.CopyClipboard}
                    shortcut={{ modifiers: ["ctrl"], key: "c" }}
                    onAction={() => copyFileToClipboard(screenshot.path)}
                  />
                  <Action.CopyToClipboard
                    content={screenshot.path}
                    title="Copy Path"
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "c" }}
                  />
                  <ActionPanel.Section>
                    <Action
                      title="Delete File"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "d" }}
                      onAction={() => deleteFile(screenshot.path)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      ))}
      {hasMore && (
        <Grid.Item
          key="load-more"
          content={{ source: "" }}
          title={`Load more... (${screenshots.length - displayedItems} remaining)`}
        />
      )}
    </Grid>
  );
}
