import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Color,
  Clipboard,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { siyuanAPI } from "./api/siyuan";
import { AssetFile } from "./types";
import path from "path";

interface Preferences {
  workspacePath: string;
}

export default function FindAssets() {
  const [searchText, setSearchText] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("all");
  const preferences = getPreferenceValues<Preferences>();

  // 稳定的搜索文本处理函数，避免频繁重新渲染导致焦点丢失
  const handleSearchTextChange = useCallback((text: string) => {
    setSearchText(text);
  }, []);

  // 使用防抖来减少频繁查询
  const [debouncedSearchText, setDebouncedSearchText] = useState(searchText);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 300); // 减少延迟时间，提升响应性

    return () => {
      clearTimeout(timer);
    };
  }, [searchText]);

  // Check workspace configuration
  const checkWorkspaceConfig = () => {
    if (!preferences.workspacePath || preferences.workspacePath.trim() === "") {
      return false;
    }
    return true;
  };

  // Search assets files (using debounced search text)
  const { isLoading, data: rawAssets = [] } = useCachedPromise(
    async (query: string, type: string) => {
      try {
        // Check workspace configuration
        if (!checkWorkspaceConfig()) {
          throw new Error("Please configure SiYuan workspace path first");
        }

        const fileType =
          type === "all" ? undefined : (type as AssetFile["type"]);
        return await siyuanAPI.searchAssets(query, fileType);
      } catch (error) {
        console.error("Failed to search assets files:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Search Failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        return [];
      }
    },
    [debouncedSearchText, filterType],
    {
      keepPreviousData: true,
      execute: checkWorkspaceConfig(), // Execute only when config is correct
    },
  );

  // Sorted file list (sorted by name) - use useMemo to avoid frequent recalculation
  const assets = useMemo(() => {
    return [...rawAssets].sort((a, b) => {
      return a.name.localeCompare(b.name, "en-US");
    });
  }, [rawAssets]);

  // Limit number of files displayed simultaneously to avoid rendering too many items
  const maxDisplayItems = 100;
  const displayAssets = useMemo(() => {
    return assets.slice(0, maxDisplayItems);
  }, [assets]);

  // Statistics - use useMemo to avoid frequent recalculation
  const { totalFiles, totalSize } = useMemo(() => {
    return {
      totalFiles: assets.length,
      totalSize: assets.reduce((sum, file) => sum + file.size, 0),
    };
  }, [assets]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Format time as date (without specific time)
  const formatDate = (timeStr: string): string => {
    if (!timeStr) return "Unknown date";
    try {
      // SiYuan 时间格式: YYYYMMDDHHMMSS
      if (timeStr.length === 14) {
        const year = timeStr.substring(0, 4);
        const month = timeStr.substring(4, 6);
        const day = timeStr.substring(6, 8);
        return `${year}-${month}-${day}`;
      }

      // ISO 格式时间
      if (timeStr.includes("T") || timeStr.includes("-")) {
        const date = new Date(timeStr);
        if (!isNaN(date.getTime())) {
          return date
            .toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })
            .replace(/\//g, "-");
        }
      }

      return timeStr.substring(0, 10); // 取前10位作为日期
    } catch {
      return timeStr;
    }
  };

  // Reference information cache
  const [referenceCache, setReferenceCache] = useState<
    Record<
      string,
      {
        doc_id: string;
        doc_title: string;
        doc_path: string;
        updated: string;
      } | null
    >
  >({});
  const [loadingReferences, setLoadingReferences] = useState<Set<string>>(
    new Set(),
  );
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());

  // Limit concurrent request count
  const maxConcurrentRequests = 3;
  const [requestQueue, setRequestQueue] = useState<string[]>([]);
  const [activeRequests, setActiveRequests] = useState(0);

  // Lazy load reference information - optimized version
  const loadReferenceInfo = async (fileName: string) => {
    if (
      referenceCache[fileName] !== undefined ||
      loadingReferences.has(fileName)
    ) {
      return; // Already loaded or loading
    }

    // Add to queue if max concurrent limit reached
    if (activeRequests >= maxConcurrentRequests) {
      setRequestQueue((prev) => [...prev, fileName]);
      return;
    }

    setLoadingReferences((prev) => new Set(prev).add(fileName));
    setActiveRequests((prev) => prev + 1);

    try {
      const reference = await siyuanAPI.findAssetReference(fileName);
      setReferenceCache((prev) => ({
        ...prev,
        [fileName]: reference,
      }));
    } catch (error) {
      console.error("Failed to load reference info:", error);
      // Record to cache even on failure to avoid repeated requests
      setReferenceCache((prev) => ({
        ...prev,
        [fileName]: null,
      }));
    } finally {
      setLoadingReferences((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fileName);
        return newSet;
      });
      setActiveRequests((prev) => prev - 1);

      // Process next request in queue
      setRequestQueue((queue) => {
        if (queue.length > 0) {
          const nextFileName = queue[0];
          const remainingQueue = queue.slice(1);
          setTimeout(() => loadReferenceInfo(nextFileName), 100);
          return remainingQueue;
        }
        return queue;
      });
    }
  };

  // Load reference info only when item becomes visible
  const handleItemVisible = (fileName: string) => {
    if (!visibleItems.has(fileName)) {
      setVisibleItems((prev) => new Set(prev).add(fileName));
      // Delayed loading to avoid triggering too many requests simultaneously
      setTimeout(() => loadReferenceInfo(fileName), Math.random() * 1000 + 200);
    }
  };

  // Get file reference info text
  const getFileSubtitle = (file: AssetFile): string => {
    const cachedReference = referenceCache[file.name];
    if (cachedReference) {
      const refDate = formatDate(cachedReference.updated);
      return `Referenced in: ${cachedReference.doc_title} • ${refDate}`;
    }
    return `File size: ${formatFileSize(file.size)} • Modified: ${formatDate(file.modTime)}`;
  };

  // Get reference document jump URL
  const getReferenceUrl = (fileName: string): string | null => {
    const cachedReference = referenceCache[fileName];
    return cachedReference ? siyuanAPI.getDocUrl(cachedReference.doc_id) : null;
  };

  // Get file icon
  const getFileIcon = (file: AssetFile) => {
    switch (file.type) {
      case "image":
        return { source: Icon.Image, tintColor: Color.Green };
      case "document":
        return { source: Icon.Document, tintColor: Color.Blue };
      case "archive":
        return { source: Icon.Box, tintColor: Color.Orange };
      case "video":
        return { source: Icon.Video, tintColor: Color.Purple };
      case "audio":
        return { source: Icon.Music, tintColor: Color.Red };
      default:
        return { source: Icon.Document, tintColor: Color.SecondaryText };
    }
  };

  // Copy content to clipboard
  const copyToClipboard = async (content: string, message: string) => {
    try {
      await Clipboard.copy(content);
      showToast({
        style: Toast.Style.Success,
        title: message,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Copy Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Copy file to desktop
  const copyFileToDesktop = async (file: AssetFile) => {
    try {
      if (!file.fullPath) {
        throw new Error("Unable to get file path");
      }

      const desktopPath = path.join(process.env.HOME || "", "Desktop");
      const destinationPath = path.join(desktopPath, file.name);

      // Use fs module to copy file
      const fs = await import("fs/promises");

      // Check if target file already exists
      try {
        await fs.access(destinationPath);
        // If file exists, generate new filename
        const nameWithoutExt = path.parse(file.name).name;
        const ext = path.parse(file.name).ext;
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const newName = `${nameWithoutExt}_${timestamp}${ext}`;
        const newDestinationPath = path.join(desktopPath, newName);
        await fs.copyFile(file.fullPath, newDestinationPath);

        showToast({
          style: Toast.Style.Success,
          title: "File Copied to Desktop",
          message: `Renamed to: ${newName}`,
        });
      } catch {
        // File doesn't exist, copy directly
        await fs.copyFile(file.fullPath, destinationPath);

        showToast({
          style: Toast.Style.Success,
          title: "File Copied to Desktop",
          message: file.name,
        });
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Copy File",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Test connection
  const testConnection = async () => {
    try {
      const isConnected = await siyuanAPI.testConnection();
      if (isConnected) {
        showToast({
          style: Toast.Style.Success,
          title: "Connection Successful",
          message: "SiYuan server connection is working",
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Connection Failed",
          message: "Unable to connect to SiYuan server",
        });
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Connection Test Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder={`Search assets files... (${totalFiles} files total, showing first ${Math.min(maxDisplayItems, totalFiles)}, ${formatFileSize(totalSize)})`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by file type"
          storeValue={true}
          onChange={setFilterType}
        >
          <List.Dropdown.Item title="All Files" value="all" />
          <List.Dropdown.Item title="Images" value="image" />
          <List.Dropdown.Item title="Documents" value="document" />
          <List.Dropdown.Item title="Archives" value="archive" />
          <List.Dropdown.Item title="Videos" value="video" />
          <List.Dropdown.Item title="Audio" value="audio" />
          <List.Dropdown.Item title="Other" value="other" />
        </List.Dropdown>
      }
    >
      {assets.length === 0 ? (
        <List.EmptyView
          icon={Icon.Folder}
          title={
            !checkWorkspaceConfig()
              ? "Workspace Path Configuration Required"
              : searchText
                ? "No Matching Files Found"
                : "Start Searching"
          }
          description={
            !checkWorkspaceConfig()
              ? "Please configure SiYuan workspace path in extension settings to search assets files"
              : searchText
                ? `No files found containing "${searchText}"`
                : "Enter keywords to search attachment files in assets folder"
          }
          actions={
            <ActionPanel>
              {!checkWorkspaceConfig() ? (
                <Action
                  title="Open Extension Settings"
                  icon={Icon.Gear}
                  onAction={openExtensionPreferences}
                  shortcut={{ modifiers: ["cmd"], key: "comma" }}
                />
              ) : null}
              <Action
                title="Test Connection"
                icon={Icon.Wifi}
                onAction={testConnection}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
            </ActionPanel>
          }
        />
      ) : (
        displayAssets.map((file) => (
          <List.Item
            key={file.fullPath}
            icon={getFileIcon(file)}
            title={file.name}
            subtitle={getFileSubtitle(file)}
            accessories={[
              { text: file.extension.toUpperCase() },
              {
                text: formatFileSize(file.size),
                tooltip: `文件大小: ${formatFileSize(file.size)}`,
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="File Operations">
                  <Action.Open
                    title="Open File"
                    icon={Icon.ArrowNe}
                    target={file.fullPath}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  {(() => {
                    // Trigger lazy loading only when user views Action panel
                    handleItemVisible(file.name);

                    const referenceUrl = getReferenceUrl(file.name);
                    return referenceUrl ? (
                      <Action.OpenInBrowser
                        title="Open Referenced Document in Siyuan"
                        icon={Icon.Document}
                        url={referenceUrl}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                    ) : null;
                  })()}
                  <Action.ShowInFinder
                    title="Show in Finder"
                    path={file.fullPath}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                  />
                  <Action
                    title="Copy to Desktop"
                    icon={Icon.Desktop}
                    onAction={() => copyFileToDesktop(file)}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Copy Information">
                  <Action
                    title="Copy File Path"
                    icon={Icon.Clipboard}
                    onAction={() =>
                      copyToClipboard(file.fullPath, "File path copied")
                    }
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action
                    title="Copy File Name"
                    icon={Icon.Text}
                    onAction={() =>
                      copyToClipboard(file.name, "File name copied")
                    }
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action
                    title="Copy Relative Path"
                    icon={Icon.Link}
                    onAction={() =>
                      copyToClipboard(
                        `assets/${file.name}`,
                        "Relative path copied (for SiYuan reference)",
                      )
                    }
                    shortcut={{ modifiers: ["cmd", "alt"], key: "c" }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Other Actions">
                  <Action
                    title="Test Connection"
                    icon={Icon.Wifi}
                    onAction={testConnection}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
      {assets.length > maxDisplayItems && (
        <List.Item
          title={`${assets.length - maxDisplayItems} more files not displayed`}
          subtitle="Please use search to narrow down results"
          icon={{ source: Icon.Info, tintColor: Color.Orange }}
        />
      )}
    </List>
  );
}
