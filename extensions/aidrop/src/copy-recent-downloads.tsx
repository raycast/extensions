import React, { useEffect, useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  closeMainWindow,
  environment,
  getPreferenceValues,
  getFrontmostApplication,
  Icon,
  Keyboard,
  List,
  openCommandPreferences,
  PopToRootType,
  Toast,
  open,
  showToast,
} from "@raycast/api";
import path from "node:path";
import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { promisify } from "node:util";

import type { FileItem } from "./lib/recent-files";
import { compatibilityNote } from "./lib/compatibility-note";
import { loadRecentFilesFromFolders } from "./lib/recent-files";
import { togglePathSelection } from "./lib/selection";
import { copySelectedFiles } from "./lib/copy-selected-files";
import { getAdjacentItemId } from "./lib/focus-navigation";
import { getSourceFolderPaths } from "./lib/source-folder";
import { formatFileSize, formatRelativeTime } from "./lib/format-file-meta";

const execFileAsync = promisify(execFile);

export default function Command() {
  const [items, setItems] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);

  const preferences = getPreferenceValues<Preferences.CopyRecentDownloads>();
  const sourceFolderPaths = useMemo(
    () => getSourceFolderPaths(preferences, homedir()),
    [
      preferences.sourceFolder,
      preferences.sourceFolder2,
      preferences.sourceFolder3,
    ],
  );
  const isMultiFolderMode = sourceFolderPaths.length > 1;

  const visibleItems = useMemo(() => {
    const normalizedQuery = searchText.trim().toLowerCase();

    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) =>
      item.name.toLowerCase().includes(normalizedQuery),
    );
  }, [items, searchText]);

  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);

    void loadRecentFilesFromFolders(sourceFolderPaths)
      .then((nextItems) => {
        setItems(nextItems);
      })
      .catch((error) => {
        setItems([]);
        setLoadError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => setIsLoading(false));
  }, [sourceFolderPaths.join(",")]);

  useEffect(() => {
    if (!visibleItems.length) {
      setFocusedItemId(null);
      return;
    }

    setFocusedItemId((current) =>
      current && visibleItems.some((item) => item.path === current)
        ? current
        : visibleItems[0].path,
    );
  }, [visibleItems]);

  async function handleCopySelectedFiles() {
    const frontmostApp = await getFrontmostApplication().catch(() => null);

    await copySelectedFiles({
      displayedItems: visibleItems,
      selectedPaths,
      assetsPath: environment.assetsPath,
      frontmostApp,
      execFile: async (file, args) => {
        await execFileAsync(file, args);
      },
      openFilesInApp: async (app, filePaths) => {
        await execFileAsync("/usr/bin/open", [
          "-a",
          app.path ?? app.name,
          ...filePaths,
        ]);
      },
      showToast: async (options) => {
        await showToast({
          style:
            options.style === "success"
              ? Toast.Style.Success
              : Toast.Style.Failure,
          title: options.title,
          message: options.message,
        });
      },
      closeWindow: async (options) => {
        await closeMainWindow({
          clearRootSearch: options.clearRootSearch,
          popToRootType: PopToRootType.Immediate,
        });
      },
    });
  }

  function toggleFileSelection(filePath: string) {
    setSelectedPaths((current) => togglePathSelection(current, filePath));
  }

  function moveFocus(direction: "next" | "previous") {
    const nextItemId = getAdjacentItemId(
      visibleItems.map((item) => item.path),
      focusedItemId,
      direction,
    );

    setFocusedItemId(nextItemId);
  }

  const selectedCount = selectedPaths.size;
  const copyActionTitle =
    selectedCount === 0
      ? "Copy File"
      : selectedCount === 1
        ? "Copy 1 Selected File"
        : `Copy ${selectedCount} Selected Files`;

  const primaryFolderPath = sourceFolderPaths[0];

  return (
    <List
      filtering={false}
      isLoading={isLoading}
      navigationTitle="Copy Recent Files"
      onSearchTextChange={setSearchText}
      onSelectionChange={(id) => {
        if (id && visibleItems.some((item) => item.path === id)) {
          setFocusedItemId(id);
        }
      }}
      searchText={searchText}
      searchBarPlaceholder="Search recent files"
      selectedItemId={focusedItemId ?? undefined}
    >
      <List.Section title="Source Folder">
        {sourceFolderPaths.map((folderPath) => {
          const folderName = path.basename(folderPath) || folderPath;
          return (
            <List.Item
              key={folderPath}
              id={`source-folder:${folderPath}`}
              icon={Icon.Folder}
              title={folderName}
              subtitle={folderPath}
              actions={
                <ActionPanel>
                  <Action
                    title="Open Source Folder"
                    icon={Icon.Folder}
                    onAction={() => open(folderPath)}
                  />
                  <Action
                    title="Set Source Folder"
                    icon={Icon.Gear}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                    onAction={openCommandPreferences}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section title="Compatibility">
        <List.Item
          id={compatibilityNote.id}
          icon={Icon.Info}
          title={compatibilityNote.title}
          subtitle={compatibilityNote.subtitle}
        />
      </List.Section>

      {visibleItems.length === 0 && !isLoading ? (
        <List.Section title="Recent Files">
          <List.Item
            id="empty-downloads"
            icon={Icon.Document}
            title={searchText ? "No Matching Files" : "No Recent Files Found"}
            subtitle={
              loadError
                ? `Could not read folder: ${loadError}`
                : searchText
                  ? "Try a different search term."
                  : `Put a few files in the source folder, then run AIDrop again.`
            }
            actions={
              <ActionPanel>
                <Action
                  title="Open Source Folder"
                  icon={Icon.Folder}
                  onAction={() => open(primaryFolderPath)}
                />
                <Action
                  title="Set Source Folder"
                  icon={Icon.Gear}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                  onAction={openCommandPreferences}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : (
        <List.Section title="Recent Files">
          {visibleItems.map((item) => {
            const isSelected = selectedPaths.has(item.path);

            const accessories: List.Item.Accessory[] = [
              { text: formatFileSize(item.size) },
              {
                text: formatRelativeTime(item.mtimeMs),
                tooltip: new Date(item.mtimeMs).toLocaleString(),
              },
            ];

            if (isMultiFolderMode) {
              accessories.unshift({
                icon: Icon.Folder,
                text: path.basename(item.sourceFolder),
              });
            }

            return (
              <List.Item
                key={item.path}
                id={item.path}
                icon={
                  isSelected
                    ? { source: Icon.CheckCircle, tintColor: Color.Green }
                    : Icon.Circle
                }
                title={item.name}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <Action
                      title={copyActionTitle}
                      icon={Icon.Clipboard}
                      onAction={handleCopySelectedFiles}
                    />
                    <Action
                      title={isSelected ? "Unselect File" : "Select File"}
                      icon={isSelected ? Icon.CheckCircle : Icon.Circle}
                      shortcut={{ modifiers: [], key: "space" }}
                      onAction={() => toggleFileSelection(item.path)}
                    />
                    <Action.ToggleQuickLook
                      shortcut={{ modifiers: ["cmd"], key: "y" }}
                    />
                    <Action
                      title="Focus Next Item"
                      icon={Icon.ArrowDown}
                      shortcut={{ modifiers: ["ctrl"], key: "j" }}
                      onAction={() => moveFocus("next")}
                    />
                    <Action
                      title="Focus Previous Item"
                      icon={Icon.ArrowUp}
                      shortcut={{ modifiers: ["ctrl"], key: "k" }}
                      onAction={() => moveFocus("previous")}
                    />
                    <Action
                      title="Open Source Folder"
                      icon={Icon.Folder}
                      shortcut={Keyboard.Shortcut.Common.Open}
                      onAction={() => open(item.sourceFolder)}
                    />
                    <Action
                      title="Set Source Folder"
                      icon={Icon.Gear}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                      onAction={openCommandPreferences}
                    />
                    <Action.ShowInFinder path={item.path} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
