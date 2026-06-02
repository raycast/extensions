import React, { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  Form,
  useNavigation,
  Detail,
  open,
  showInFinder,
} from "@raycast/api";
import { getActionShortcut, forceCopy, formatBytes, getDownloadIcon } from "../helpers";
import * as fs from "fs";
import { DownloadItem, BridgeMessage } from "../types";
import { subscribeToDownloads, getCurrentDownloads } from "../context/BrowserStore";

interface DownloadsViewProps {
  downloads: DownloadItem[];
  sendToSocket: (msg: BridgeMessage) => void;
  windowFilter?: string;
  browserFilter: string;
  requestData?: (channel: string) => void;
  title: string;
  onClose?: () => void;
}

export function DownloadsView({
  downloads: initialDownloads,
  sendToSocket,
  browserFilter,
  requestData,
  title,
  onClose,
}: DownloadsViewProps) {
  const { pop } = useNavigation();

  // V1405: Use global store as source of truth for Frame 1 to prevent flicker
  const [liveDownloads, setLiveDownloads] = useState<DownloadItem[]>(() => {
    const current = getCurrentDownloads();
    return current.length > 0 ? current : initialDownloads;
  });

  // Subscribe to live download updates for progress bars
  useEffect(() => {
    // Initial sync just in case
    setLiveDownloads(getCurrentDownloads());

    const unsubscribe = subscribeToDownloads((freshDownloads) => {
      setLiveDownloads(freshDownloads);
    });
    return unsubscribe;
  }, []);

  // V44: Universal Rebuild - Trigger onClose on unmount
  useEffect(() => {
    return () => {
      if (onClose) onClose();
    };
  }, [onClose]);

  // V400: Subscription lifecycle — tell browser to start/stop pulling downloads
  useEffect(() => {
    if (requestData) {
      requestData("downloads");
    }
    // V400: Subscribe to downloads channel
    sendToSocket({ type: "START_SUBSCRIPTION", channel: "downloads" });
    return () => {
      // V400: Unsubscribe when leaving downloads view
      sendToSocket({ type: "STOP_SUBSCRIPTION", channel: "downloads" });
    };
  }, [requestData, sendToSocket]);

  const filteredDownloads = React.useMemo(() => {
    if (browserFilter === "all") return liveDownloads;
    return liveDownloads.filter((item) => {
      // Download IDs from bridge follow the pattern "browserName-originalId"
      const idStr = item.id?.toString() || "";
      return idStr.startsWith(`${browserFilter}-`);
    });
  }, [liveDownloads, browserFilter]);

  const inProgress = filteredDownloads.filter((d) => d.state === "in_progress");
  const history = filteredDownloads.filter((d) => d.state === "complete" || d.state === "interrupted");

  // Group history downloads dynamically by "Date"
  const historyGroupsMap = history.reduce(
    (groups: Record<string, { groupName: string; sortTime: number; items: DownloadItem[] }>, item) => {
      const date = new Date(item.endTime || item.startTime);

      const now = new Date();
      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday =
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear();

      let groupName = "";
      let sortTime = date.getTime();

      if (isToday) {
        groupName = "Today";
        sortTime = now.getTime(); // Always sort today first
      } else if (isYesterday) {
        groupName = "Yesterday";
        sortTime = now.getTime() - 86400000;
      } else {
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const dateStr = date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
        groupName = `${dateStr} (${diffDays} days ago)`;

        // Normalize the sorttime to the start of the day so items on the same day group together
        sortTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      }

      if (!groups[groupName]) {
        groups[groupName] = { groupName, sortTime, items: [] };
      }
      groups[groupName].items.push(item);
      return groups;
    },
    {},
  );

  // Preserve descending time order for groups
  const sortedGroups = Object.values(historyGroupsMap).sort((a, b) => {
    if (a.groupName === "Today") return -1;
    if (b.groupName === "Today") return 1;
    if (a.groupName === "Yesterday") return -1;
    if (b.groupName === "Yesterday") return 1;

    return b.sortTime - a.sortTime;
  });

  return (
    <List
      navigationTitle={title}
      searchBarPlaceholder={`Search ${title.toLowerCase()}...`}
      actions={
        <ActionPanel>
          <Action
            title="Back to Tabs"
            icon={{ source: Icon.ArrowLeft, tintColor: Color.Yellow }}
            shortcut={getActionShortcut("downloads") || { modifiers: ["shift"], key: "tab" }}
            onAction={pop}
          />
        </ActionPanel>
      }
    >
      {inProgress.length > 0 && (
        <List.Section title="In Progress" subtitle={`${inProgress.length} items`}>
          {inProgress.map((item) => (
            <DownloadListItem key={item.id} item={item} sendToSocket={sendToSocket} />
          ))}
        </List.Section>
      )}

      {sortedGroups.map((group) => (
        <List.Section key={group.groupName} title={group.groupName} subtitle={`${group.items.length} items`}>
          {group.items.map((item) => (
            <DownloadListItem key={item.id} item={item} sendToSocket={sendToSocket} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function RenameForm({ item, onRename }: { item: DownloadItem; onRename: (newName: string) => void }) {
  const { pop } = useNavigation();
  const fullFilename = item.filename?.split(/[\\/]/).pop() || "";
  // V121: Strip extension for easier renaming, Bridge will put it back
  const nameWithoutExt = fullFilename.replace(/\.[^/.]+$/, "");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename"
            onSubmit={(values) => {
              onRename(values.newName);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Renaming: ${fullFilename}`} />
      <Form.TextField id="newName" title="New Name" defaultValue={nameWithoutExt} />
    </Form>
  );
}

function DownloadPreview({ item }: { item: DownloadItem }) {
  const filename = item.filename?.split(/[\\/]/).pop() || item.filename || "Unknown";
  const isImage = item.mime?.startsWith("image/");
  const isMissing = item.state === "complete" && !item.exists;
  const { pop } = useNavigation();

  // Text File Detection
  const textExtensions = [
    ".txt",
    ".md",
    ".log",
    ".json",
    ".js",
    ".ts",
    ".html",
    ".css",
    ".py",
    ".sh",
    ".yaml",
    ".yml",
    ".csv",
    ".xml",
    ".env",
  ];
  const isText =
    (item.mime?.startsWith("text/") || textExtensions.some((ext) => item.filename?.toLowerCase().endsWith(ext))) &&
    !item.mime?.includes("pdf");

  let textContent = "";
  if (isText && item.filename && !isMissing) {
    try {
      // Read first 4KB of text files for a snippet
      const buffer = Buffer.alloc(4096);
      const fd = fs.openSync(item.filename, "r");
      const bytesRead = fs.readSync(fd, buffer, 0, 4096, 0);
      fs.closeSync(fd);
      textContent = buffer.toString("utf8", 0, bytesRead);
    } catch {
      textContent = "Error reading file content.";
    }
  }

  const itemIcon = getDownloadIcon(item.mime, item.fileIcon, item.url);

  let markdown = `## ${filename}\n\n`;

  if (isMissing) {
    markdown += `> [!WARNING]\n> This file is missing or has been moved from its original location.`;
  } else if (isImage && item.filename) {
    markdown += `![${filename}](file:///${item.filename.replace(/\\/g, "/")})`;
  } else if (isText && textContent) {
    const ext = item.filename?.split(".").pop() || "";
    markdown += "### File Content Snippet\n\n";
    markdown +=
      "```" + ext + "\n" + textContent + (textContent.length >= 4096 ? "\n\n... (content truncated)" : "") + "\n```";
  } else {
    const iconSource = typeof itemIcon === "string" ? itemIcon : (itemIcon as { source: string | Icon }).source;
    // Pure icon-centric presentation for generic files - resized to 80px for maximum sharpness
    markdown = `## ${filename}\n\n <br/> <br/> <br/> \n\n <img src="${iconSource}" width="32" />`;
  }

  return (
    <Detail
      navigationTitle={`Preview: ${filename}`}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={filename} />
          <Detail.Metadata.Label title="Size" text={formatBytes(item.fileSize || item.totalBytes)} />
          <Detail.Metadata.Label
            title="Status"
            text={item.state.charAt(0).toUpperCase() + item.state.slice(1)}
            icon={
              item.state === "complete"
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : { source: Icon.Circle, tintColor: Color.Blue }
            }
          />
          {item.startTime && <Detail.Metadata.Label title="Started" text={new Date(item.startTime).toLocaleString()} />}
          {item.endTime && <Detail.Metadata.Label title="Finished" text={new Date(item.endTime).toLocaleString()} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Mime Type" text={item.mime || "Unknown"} />
          <Detail.Metadata.Label title="Path" text={item.filename || "Unknown"} />
          <Detail.Metadata.Link title="URL" text={item.url} target={item.url} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {!isMissing && item.state === "complete" && (
            <ActionPanel.Section title="File Actions">
              <Action
                title="Open File"
                icon={{ source: Icon.Document, tintColor: Color.Blue }}
                onAction={async () => {
                  if (item.filename) {
                    await open(item.filename);
                    showToast({ title: `Opening: ${filename}`, style: Toast.Style.Success });
                  }
                }}
              />
              <Action
                title="Show in Folder"
                icon={{ source: Icon.Finder, tintColor: Color.Blue }}
                shortcut={{ modifiers: ["ctrl"], key: "f" }}
                onAction={async () => {
                  if (item.filename) {
                    await showInFinder(item.filename);
                    showToast({ title: "Showing in folder", style: Toast.Style.Success });
                  }
                }}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section title="Navigation">
            <Action
              title="Back to List"
              icon={{ source: Icon.ArrowLeft, tintColor: Color.Yellow }}
              shortcut={getActionShortcut("downloads") || { modifiers: ["shift"], key: "tab" }}
              onAction={pop}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Metadata">
            {item.state === "complete" && item.exists && item.filename && (
              <Action
                title="Copy File Path"
                icon={{ source: Icon.CopyClipboard, tintColor: Color.SecondaryText }}
                shortcut={{ modifiers: ["ctrl"], key: "c" }}
                onAction={() => {
                  forceCopy(item.filename);
                  showToast({ style: Toast.Style.Success, title: "Copied File Path", message: item.filename });
                }}
              />
            )}
            <Action
              title="Copy Download URL"
              icon={{ source: Icon.Link, tintColor: Color.SecondaryText }}
              shortcut={{ modifiers: ["ctrl"], key: "e" }}
              onAction={() => {
                forceCopy(item.url);
                showToast({ style: Toast.Style.Success, title: "Copied Download URL", message: item.url });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function DownloadListItem({ item, sendToSocket }: { item: DownloadItem; sendToSocket: (msg: BridgeMessage) => void }) {
  const { pop } = useNavigation();
  // Extract clean filename from local path
  const filename = item.filename ? item.filename.split(/[\\/]/).pop() || item.filename : item.url || "Unknown";

  // Extract domain for subtitle
  let domain = "";
  try {
    domain = new URL(item.url).hostname.replace("www.", "");
  } catch {
    domain = item.url;
  }

  // Build Accessories
  const accessories: List.Item.Accessory[] = [];

  const received = formatBytes(item.bytesReceived);
  const total = item.totalBytes > 0 ? formatBytes(item.totalBytes) : "?";
  const percent = item.totalBytes > 0 ? Math.floor((item.bytesReceived / item.totalBytes) * 100) : 0;

  if (item.state === "in_progress") {
    accessories.push({
      tag: {
        value: item.paused ? "Paused" : `${percent}% · ${received} / ${total}`,
        color: item.paused ? Color.Yellow : Color.Blue,
      },
      tooltip: item.paused
        ? `Paused at ${received} / ${total} (${percent}%)`
        : `Downloaded ${received} / ${total} (${percent}%)`,
    });
  } else if (item.state === "complete") {
    accessories.push({
      text: { value: formatBytes(item.fileSize), color: Color.SecondaryText },
      tooltip: `File Size: ${formatBytes(item.fileSize)}`,
      icon: { source: Icon.HardDrive, tintColor: Color.SecondaryText },
    });
  } else if (item.state === "interrupted") {
    const isCancelled = item.error === "USER_CANCELED";
    accessories.push({
      tag: {
        value: isCancelled ? "Cancelled" : item.danger !== "safe" ? "Blocked" : "Failed",
        color: isCancelled ? Color.SecondaryText : Color.Red,
      },
      tooltip: isCancelled
        ? `Cancelled at ${received} / ${total} (${percent}%)`
        : `Failed at ${received} / ${total} (${percent}%)`,
    });
  }

  const itemIcon = getDownloadIcon(item.mime, item.fileIcon, item.url);

  const isMissing = item.state === "complete" && !item.exists;

  const finalAccessories = [...accessories];
  if (isMissing) {
    finalAccessories.unshift({
      tag: { value: "Removed", color: Color.SecondaryText },
      tooltip: "File deleted or moved from disk",
    });
  }

  return (
    <List.Item
      title={filename}
      subtitle={domain}
      icon={itemIcon}
      quickLook={item.exists && item.filename ? { path: item.filename, name: filename } : undefined}
      accessories={finalAccessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Actions">
            {item.state === "complete" ? (
              item.exists && (
                <>
                  <Action
                    title="Open File"
                    icon={{ source: Icon.Document, tintColor: Color.Blue }}
                    onAction={async () => {
                      if (item.filename) {
                        await open(item.filename);
                        showToast({ title: `Opening: ${filename}`, style: Toast.Style.Success });
                      }
                    }}
                  />
                  <Action.Push
                    title="Preview File"
                    icon={{ source: Icon.Sidebar, tintColor: Color.Magenta }}
                    shortcut={{ modifiers: ["ctrl"], key: "p" }}
                    target={<DownloadPreview item={item} />}
                  />
                </>
              )
            ) : item.state === "in_progress" ? (
              item.paused ? (
                <Action
                  title="Resume Download"
                  icon={{ source: Icon.Play, tintColor: Color.Blue }}
                  onAction={() => {
                    sendToSocket({ type: "RESUME_DOWNLOAD", id: item.id });
                    showToast({ title: "Resumed Download", style: Toast.Style.Success });
                  }}
                />
              ) : (
                <Action
                  title="Pause Download"
                  icon={{ source: Icon.Pause, tintColor: Color.Blue }}
                  onAction={() => {
                    sendToSocket({ type: "PAUSE_DOWNLOAD", id: item.id });
                    showToast({ title: "Paused Download", style: Toast.Style.Success });
                  }}
                />
              )
            ) : (
              <Action
                title="Remove from List"
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "d" }}
                onAction={() => {
                  sendToSocket({ type: "ERASE_DOWNLOAD_HISTORY", id: item.id });
                  showToast({ title: `Removed: ${filename}`, style: Toast.Style.Success });
                }}
              />
            )}

            {item.state === "interrupted" && (
              <Action
                title="Retry Download"
                icon={{ source: Icon.Repeat, tintColor: Color.Blue }}
                onAction={() => {
                  sendToSocket({ type: "RESUME_DOWNLOAD", id: item.id });
                  showToast({ title: "Retrying Download...", style: Toast.Style.Success });
                }}
              />
            )}

            {item.state === "complete" ? (
              item.exists ? (
                <Action.Trash
                  title="Move to Recycle Bin"
                  paths={[item.filename]}
                  shortcut={{ modifiers: ["ctrl"], key: "d" }}
                  onTrash={() => {
                    sendToSocket({ type: "ERASE_DOWNLOAD_HISTORY", id: item.id });
                    showToast({ title: `Moved to Recycle Bin: ${filename}`, style: Toast.Style.Success });
                  }}
                />
              ) : (
                <Action
                  title="Remove from List"
                  icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "d" }}
                  onAction={() => {
                    sendToSocket({ type: "ERASE_DOWNLOAD_HISTORY", id: item.id });
                    showToast({ title: `Removed: ${filename}`, style: Toast.Style.Success });
                  }}
                />
              )
            ) : (
              item.state === "in_progress" && (
                <Action
                  title="Cancel Download"
                  icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "d" }}
                  onAction={() => {
                    sendToSocket({ type: "CANCEL_DOWNLOAD", id: item.id });
                    showToast({ title: `Cancelled: ${filename}`, style: Toast.Style.Success });
                  }}
                />
              )
            )}
          </ActionPanel.Section>

          {item.state === "complete" && item.exists && (
            <ActionPanel.Section title="File Management">
              {item.filename && (
                <Action
                  title="Show in Folder"
                  icon={{ source: Icon.Finder, tintColor: Color.Blue }}
                  shortcut={{ modifiers: ["ctrl"], key: "f" }}
                  onAction={async () => {
                    await showInFinder(item.filename!);
                    showToast({ title: "Showing in folder", style: Toast.Style.Success });
                  }}
                />
              )}
              {item.filename && (
                <>
                  <Action.OpenWith
                    title="Open with…"
                    path={item.filename}
                    icon={{ source: Icon.Upload, tintColor: Color.Blue }}
                    shortcut={{ modifiers: ["ctrl"], key: "o" }}
                  />
                  <Action.ToggleQuickLook
                    icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Blue }}
                    shortcut={{ modifiers: ["ctrl"], key: "y" }}
                  />
                </>
              )}
              <Action.Push
                title="Rename File"
                icon={{ source: Icon.Pencil, tintColor: Color.Blue }}
                shortcut={{ modifiers: ["ctrl"], key: "r" }}
                target={
                  <RenameForm
                    item={item}
                    onRename={(newName) => {
                      sendToSocket({ type: "RENAME_FILE", path: item.filename, newName });
                      showToast({ title: "File Renamed", style: Toast.Style.Success });
                    }}
                  />
                }
              />
            </ActionPanel.Section>
          )}

          <ActionPanel.Section title="Navigation">
            <Action
              title="Back to List"
              icon={{ source: Icon.ArrowLeft, tintColor: Color.Yellow }}
              shortcut={getActionShortcut("downloads") || { modifiers: ["shift"], key: "tab" }}
              onAction={pop}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Metadata">
            {item.state === "complete" && item.filename && !isMissing && (
              <Action
                title="Copy File Path"
                icon={{ source: Icon.CopyClipboard, tintColor: Color.SecondaryText }}
                shortcut={{ modifiers: ["ctrl"], key: "c" }}
                onAction={() => {
                  forceCopy(item.filename);
                  showToast({ style: Toast.Style.Success, title: "Copied File Path", message: item.filename });
                }}
              />
            )}
            <Action
              title="Copy Download URL"
              icon={{ source: Icon.Link, tintColor: Color.SecondaryText }}
              shortcut={{ modifiers: ["ctrl"], key: "e" }}
              onAction={() => {
                forceCopy(item.url);
                showToast({ style: Toast.Style.Success, title: "Copied Download URL", message: item.url });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
