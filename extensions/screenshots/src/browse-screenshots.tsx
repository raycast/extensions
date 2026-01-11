import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  getPreferenceValues,
  Grid,
  Icon,
  openExtensionPreferences,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { execSync } from "child_process";
import { accessSync, constants, readdirSync, statSync, watch } from "fs";
import { homedir } from "os";
import { basename, join } from "path";
import { useCallback, useEffect, useMemo, useState } from "react";
import sizeOf from "image-size";

interface Screenshot {
  path: string;
  name: string;
  mtime: Date;
  dimensions: string;
  relativeTime: string;
}

const BATCH_SIZE = 20;

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString();
}

function getImageDimensions(filePath: string): string {
  try {
    const dimensions = sizeOf(filePath);
    if (dimensions.width && dimensions.height) {
      return `${dimensions.width}×${dimensions.height}`;
    }
  } catch {
    // File unreadable or invalid image
  }
  return "";
}

function getScreenshotDirectory(): string {
  const { screenshotPath } = getPreferenceValues<Preferences>();

  if (screenshotPath?.trim()) {
    return screenshotPath;
  }

  try {
    const systemPath = execSync("defaults read com.apple.screencapture location", {
      encoding: "utf8",
      timeout: 5000,
    }).trim();
    if (systemPath) {
      return systemPath;
    }
  } catch {
    // System default not set
  }

  return join(homedir(), "Desktop");
}

function loadScreenshots(directory: string): Screenshot[] {
  const screenshots: Screenshot[] = [];

  try {
    const files = readdirSync(directory);

    for (const file of files) {
      if (!file.toLowerCase().endsWith(".png")) continue;

      const filePath = join(directory, file);
      try {
        const stat = statSync(filePath);
        if (!stat.isFile()) continue;

        screenshots.push({
          path: filePath,
          name: basename(file, ".png"),
          mtime: stat.mtime,
          dimensions: getImageDimensions(filePath),
          relativeTime: getRelativeTime(stat.mtime),
        });
      } catch {
        // Skip unreadable files
      }
    }
  } catch {
    // Directory unreadable
  }

  screenshots.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  return screenshots;
}

function useScreenshots(directory: string) {
  const [allScreenshots, setAllScreenshots] = useState<Screenshot[]>([]);
  const [displayCount, setDisplayCount] = useState(BATCH_SIZE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setIsLoading(true);
    try {
      accessSync(directory, constants.R_OK);
      setAllScreenshots(loadScreenshots(directory));
      setError(null);
    } catch {
      setError(`Cannot access directory: ${directory}`);
      setAllScreenshots([]);
    }
    setIsLoading(false);
  }, [directory]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    let watcher: ReturnType<typeof watch> | null = null;

    try {
      watcher = watch(directory, { persistent: false }, refresh);
    } catch {
      // Watching not supported
    }

    return () => watcher?.close();
  }, [directory, refresh]);

  const displayedScreenshots = useMemo(() => allScreenshots.slice(0, displayCount), [allScreenshots, displayCount]);

  const hasMore = displayCount < allScreenshots.length;

  const loadMore = useCallback(() => {
    if (hasMore) {
      setDisplayCount((prev) => prev + BATCH_SIZE);
    }
  }, [hasMore]);

  return {
    screenshots: displayedScreenshots,
    isLoading,
    error,
    hasMore,
    loadMore,
  };
}

async function pasteScreenshot(filePath: string): Promise<void> {
  try {
    await Clipboard.copy({ file: filePath });
    await closeMainWindow();
    await new Promise((resolve) => setTimeout(resolve, 100));
    execSync(`osascript -e 'tell application "System Events" to keystroke "v" using command down'`, { timeout: 5000 });
    await showHUD("Pasted screenshot");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to paste",
      message: String(error),
    });
  }
}

async function copyScreenshot(filePath: string): Promise<void> {
  try {
    await Clipboard.copy({ file: filePath });
    await showHUD("Copied to clipboard");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to copy",
      message: String(error),
    });
  }
}

interface EmptyViewProps {
  icon: Icon;
  title: string;
  description: string;
}

function EmptyView({ icon, title, description }: EmptyViewProps) {
  return (
    <Grid>
      <Grid.EmptyView
        icon={icon}
        title={title}
        description={description}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </Grid>
  );
}

interface ScreenshotActionsProps {
  path: string;
}

function ScreenshotActions({ path }: ScreenshotActionsProps) {
  return (
    <ActionPanel>
      <Action title="Paste" icon={Icon.Clipboard} onAction={() => pasteScreenshot(path)} />
      <Action title="Copy to Clipboard" icon={Icon.CopyClipboard} onAction={() => copyScreenshot(path)} />
      <Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />
      <Action.Open
        title="Open in Preview"
        target={path}
        application="Preview"
        icon={{ fileIcon: "/System/Applications/Preview.app" }}
      />
      <Action.ShowInFinder path={path} />
      <Action.Trash paths={[path]} shortcut={{ modifiers: ["cmd"], key: "backspace" }} />
    </ActionPanel>
  );
}

function formatSubtitle(screenshot: Screenshot): string {
  if (screenshot.dimensions) {
    return `${screenshot.relativeTime} • ${screenshot.dimensions}`;
  }
  return screenshot.relativeTime;
}

export default function Command() {
  const directory = getScreenshotDirectory();
  const { screenshots, isLoading, error, hasMore, loadMore } = useScreenshots(directory);

  if (error) {
    return <EmptyView icon={Icon.ExclamationMark} title="Cannot Access Screenshots" description={error} />;
  }

  if (!isLoading && screenshots.length === 0) {
    return (
      <EmptyView icon={Icon.Image} title="No Screenshots Found" description={`No PNG files found in ${directory}`} />
    );
  }

  function handleSelectionChange(id: string | null): void {
    if (id && hasMore) {
      const index = screenshots.findIndex((s) => s.path === id);
      if (index >= screenshots.length - 5) {
        loadMore();
      }
    }
  }

  return (
    <Grid isLoading={isLoading} onSelectionChange={handleSelectionChange}>
      {screenshots.map((screenshot) => (
        <Grid.Item
          key={screenshot.path}
          id={screenshot.path}
          content={screenshot.path}
          title={screenshot.name}
          subtitle={formatSubtitle(screenshot)}
          quickLook={{ path: screenshot.path }}
          actions={<ScreenshotActions path={screenshot.path} />}
        />
      ))}
    </Grid>
  );
}
