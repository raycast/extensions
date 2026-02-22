import { ActionPanel, Action, Clipboard, Color, Icon, List, getPreferenceValues, showHUD } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";
import { useMemo, useState } from "react";

import { getRecentFiles } from "./utils/files";
import { formatPaths } from "./utils/formatter";
import { getScreenshotDir } from "./utils/screenshot";
import { FileItem, Preferences } from "./utils/types";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".heic", ".tiff"]);
const TEXT_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".csv",
  ".log",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".sh",
]);

function tildePath(p: string): string {
  const home = process.env.HOME ?? "";
  return home && p.startsWith(home) ? "~" + p.slice(home.length) : p;
}

function formatRelativeDate(mtime: number): string {
  const diff = Date.now() - mtime;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(mtime).toLocaleDateString();
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDetailContent(item: FileItem, focused: boolean): React.ReactNode {
  if (!focused) return <List.Item.Detail />;

  const ext = path.extname(item.path).toLowerCase();
  let markdown = "";

  if (IMAGE_EXTENSIONS.has(ext)) {
    markdown = `![Preview](file://${encodeURI(item.path)})`;
  } else if (TEXT_EXTENSIONS.has(ext)) {
    try {
      const content = fs.readFileSync(item.path, "utf8");
      const truncated = content.length > 5000 ? content.slice(0, 5000) + "\n\n..." : content;
      markdown = ext === ".md" ? truncated : "```\n" + truncated + "\n```";
    } catch {
      markdown = "_Could not read file_";
    }
  }

  let size = "";
  try {
    size = formatFileSize(fs.statSync(item.path).size);
  } catch {
    // ignore
  }

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={item.name} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Path" text={tildePath(item.path)} />
          <List.Item.Detail.Metadata.Label title="Modified" text={new Date(item.mtime).toLocaleString()} />
          {size ? <List.Item.Detail.Metadata.Label title="Size" text={size} /> : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function Command() {
  const { additionalDirs, maxRecentFiles, includeDownloads } = getPreferenceValues<Preferences>();

  const screenshotDir = useMemo(() => getScreenshotDir(), []);
  const recentFiles = useMemo(
    () => getRecentFiles({ screenshotDir, includeDownloads, additionalDirs, maxRecentFiles }),
    [],
  );

  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  function toggleSelect(filePath: string) {
    setSelectedPaths((prev) => {
      const idx = prev.indexOf(filePath);
      if (idx === -1) return [...prev, filePath];
      return prev.filter((p) => p !== filePath);
    });
  }

  function getAccessories(item: FileItem): List.Item.Accessory[] {
    const isSelected = selectedPaths.includes(item.path);
    const dateTag: List.Item.Accessory = {
      text: { value: formatRelativeDate(item.mtime), color: Color.SecondaryText },
    };
    if (!isSelected) return [dateTag];
    return [{ icon: Icon.Checkmark, tooltip: "Selected" }, dateTag];
  }

  async function handleCopy(currentPath: string) {
    const paths = selectedPaths.length > 0 ? selectedPaths : [currentPath];
    await Clipboard.copy(formatPaths(paths));
    await showHUD(`Copied ${paths.length} ${paths.length === 1 ? "file" : "files"}`);
  }

  function renderItem(item: FileItem) {
    return (
      <List.Item
        key={item.path}
        id={item.path}
        title={item.name}
        accessories={getAccessories(item)}
        detail={getDetailContent(item, focusedId === item.path)}
        actions={
          <ActionPanel>
            <Action
              title="Toggle Select"
              icon={selectedPaths.includes(item.path) ? Icon.XMarkCircle : Icon.Circle}
              onAction={() => toggleSelect(item.path)}
            />
            <Action
              title="Copy Selected Files"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
              onAction={() => handleCopy(item.path)}
            />
            <Action
              title="Clear Selection"
              icon={Icon.Trash}
              shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
              onAction={() => setSelectedPaths([])}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      filtering={true}
      searchBarPlaceholder="Search files..."
      isShowingDetail={true}
      onSelectionChange={(id) => setFocusedId(id ?? null)}
    >
      {recentFiles.map(renderItem)}
    </List>
  );
}
