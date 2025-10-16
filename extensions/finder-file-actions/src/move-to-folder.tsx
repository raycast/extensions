import {
  Action,
  ActionPanel,
  Icon,
  List,
  LocalStorage,
  Toast,
  closeMainWindow,
  environment,
  popToRoot,
  showToast,
  getPreferenceValues,
  getSelectedFinderItems,
  showHUD,
  confirmAlert,
  LaunchProps,
} from "@raycast/api";

import { usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { runAppleScript } from "run-applescript";
import fs from "fs-extra";
import path from "path";

import { searchSpotlight } from "./common/search-spotlight";
import { SpotlightSearchPreferences, SpotlightSearchResult, PinnedFolder } from "./common/types";
import { folderName, lastUsedSort, fixDoubleConcat } from "./common/utils";
import { fsAsync } from "./common/fs-async";
import { CacheManager } from "./common/cache-manager";

interface RecentFolder extends SpotlightSearchResult {
  lastUsed: Date;
}

export default function Command(props: LaunchProps) {
  const [searchText, setSearchText] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [recentFolders, setRecentFolders] = useState<RecentFolder[]>([]);
  const [pinnedFolders, setPinnedFolders] = useState<PinnedFolder[]>([]);
  const [folders, setFolders] = useState<SpotlightSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [canExecute, setCanExecute] = useState<boolean>(false);
  const [hasCheckedPreferences, setHasCheckedPreferences] = useState<boolean>(false);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [isShowingDetail, setIsShowingDetail] = useState<boolean>(false);
  const [isCopyMode] = useState<boolean>(props?.arguments?.mode === "copy");
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  const abortable = useRef<AbortController>();
  const preferences = getPreferenceValues<SpotlightSearchPreferences>();
  const maxRecentFolders = parseInt(preferences.maxRecentFolders || "10");
  const cacheManager = CacheManager.getInstance();

  // Function to check if Finder is the frontmost application
  async function isFinderFrontmost() {
    try {
      const result = await runAppleScript(`
        tell application "System Events"
          set frontApp to name of first application process whose frontmost is true
          if frontApp is "Finder" then
            return true
          else
            return false
          end if
        end tell
      `);
      return result.trim() === "true";
    } catch (error) {
      console.error("Error checking if Finder is frontmost:", error);
      return false;
    }
  }

  // Function to get selected files from Finder
  async function getSelectedFinderFiles() {
    try {
      // First check if Finder is the frontmost application
      const finderIsFrontmost = await isFinderFrontmost();
      if (!finderIsFrontmost) {
        setSelectionError("Please select files in Finder first and make sure Finder is the active application.");
        setIsLoading(false);
        return;
      }

      const selectedItems = await getSelectedFinderItems();

      if (selectedItems && selectedItems.length > 0) {
        const filePaths = selectedItems.map((item) => item.path);
        setSelectedFiles(filePaths);
        setSelectionError(null);
        setIsLoading(false);
      } else {
        setSelectionError("No files selected. Please select files in Finder first.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error(error);

      // Check if the error is because Finder isn't the frontmost application
      if (error instanceof Error && error.message.includes("Finder isn't the frontmost application")) {
        setSelectionError("Please select files in Finder first and make sure Finder is the active application.");
      } else {
        setSelectionError("Failed to get selected files from Finder. Please try again.");
      }

      setIsLoading(false);
    }
  }

  // Load user preferences
  useEffect(() => {
    async function loadUserPreferences() {
      try {
        const detailPreference = await LocalStorage.getItem(`${environment.extensionName}-show-details`);
        if (detailPreference !== undefined) {
          setIsShowingDetail(detailPreference === "true");
        }
      } catch (error) {
        console.error("Error loading user preferences:", error);
      }
    }

    loadUserPreferences();
  }, []);

  // Save detail view preference when it changes
  useEffect(() => {
    async function saveDetailPreference() {
      try {
        await LocalStorage.setItem(`${environment.extensionName}-show-details`, isShowingDetail.toString());
      } catch (error) {
        console.error("Error saving detail preference:", error);
      }
    }

    // Only save after initial load
    if (hasCheckedPreferences) {
      saveDetailPreference();
    }
  }, [isShowingDetail, hasCheckedPreferences]);

  // Fix double text issue
  let fixedText = "";
  useEffect(() => {
    fixedText = fixDoubleConcat(searchText);

    if (fixedText !== searchText) {
      setSearchText(fixedText);
    }
  }, [searchText]);

  // Get selected files from Finder
  useEffect(() => {
    getSelectedFinderFiles();
    loadRecentFolders();
  }, []);

  // Load recent folders from storage
  async function loadRecentFolders() {
    try {
      const storedFolders = await LocalStorage.getItem(`${environment.extensionName}-recent-folders`);

      if (storedFolders) {
        const parsedFolders = JSON.parse(storedFolders as string);
        // Convert string dates back to Date objects
        const foldersWithDates = parsedFolders.map((folder: Record<string, unknown>) => ({
          ...folder,
          lastUsed: new Date(folder.lastUsed as string),
          kMDItemLastUsedDate: folder.kMDItemLastUsedDate ? new Date(folder.kMDItemLastUsedDate as string) : undefined,
          kMDItemContentModificationDate: folder.kMDItemContentModificationDate
            ? new Date(folder.kMDItemContentModificationDate as string)
            : undefined,
          kMDItemFSCreationDate: folder.kMDItemFSCreationDate
            ? new Date(folder.kMDItemFSCreationDate as string)
            : undefined,
        }));

        // Filter out folders that no longer exist
        const existingFolders = foldersWithDates.filter((folder: RecentFolder) => {
          const exists = fs.existsSync(folder.path);
          if (!exists) {
            console.log(`Removing non-existent folder from recent folders: ${folder.path}`);
          }
          return exists;
        });

        setRecentFolders(existingFolders);

        // If we filtered out any folders, save the updated list
        if (existingFolders.length !== foldersWithDates.length) {
          saveRecentFolders(existingFolders);
        }
      }
      setHasCheckedPreferences(true);
    } catch (error) {
      console.error("Error loading recent folders:", error);
      setHasCheckedPreferences(true);
    }
  }

  // Save recent folders to storage
  async function saveRecentFolders(folders: RecentFolder[]) {
    try {
      await LocalStorage.setItem(`${environment.extensionName}-recent-folders`, JSON.stringify(folders));
    } catch (error) {
      console.error("Error saving recent folders:", error);
    }
  }

  // Add folder to recent folders
  function addToRecentFolders(folder: SpotlightSearchResult) {
    // Check if folder exists before adding to recent folders
    if (!fs.existsSync(folder.path)) {
      console.error(`Cannot add non-existent folder to recent folders: ${folder.path}`);
      return;
    }

    const recentFolder: RecentFolder = {
      ...folder,
      lastUsed: new Date(),
    };

    // Remove if already exists
    const updatedFolders = recentFolders.filter((f) => f.path !== folder.path);

    // Add to beginning of array
    const newRecentFolders = [recentFolder, ...updatedFolders].slice(0, maxRecentFolders);

    setRecentFolders(newRecentFolders);
    saveRecentFolders(newRecentFolders);
  }

  // Remove folder from recent folders
  async function removeFromRecentFolders(folderPath: string) {
    const updatedFolders = recentFolders.filter((f) => f.path !== folderPath);
    setRecentFolders(updatedFolders);
    await saveRecentFolders(updatedFolders);

    await showToast({
      style: Toast.Style.Success,
      title: "Removed from Recent Folders",
      message: folderPath,
    });
  }

  // Perform search
  usePromise(
    searchSpotlight,
    [
      searchText,
      currentPath || "",
      abortable,
      (results: SpotlightSearchResult[]) => {
        setFolders(results.sort(lastUsedSort));
      },
    ],
    {
      onWillExecute: () => {
        setIsQuerying(true);
        setCanExecute(false);
        // Clear folders when starting a new search
        setFolders([]);
      },
      onData: () => {
        setIsQuerying(false);
      },
      onError: (e) => {
        if (e.name !== "AbortError") {
          showToast({
            title: "Search Error",
            message: "Something went wrong with the search. Please try again.",
            style: Toast.Style.Failure,
          });
        }
        setIsQuerying(false);
      },
      execute: hasCheckedPreferences && canExecute && !!searchText,
      abortable,
    }
  );

  // Reset search when text changes
  useEffect(() => {
    (async () => {
      abortable.current?.abort();
      setFolders([]);
      setIsQuerying(false);
      setCanExecute(true);
    })();
  }, [searchText]);

  // Add a useEffect to focus the first search result when search text changes
  useEffect(() => {
    if (searchText && folders.length > 0) {
      // Focus the first search result
      setSelectedItemId(`subfolder-${folders[0].path}-0`);
    }
  }, [searchText, folders]);

  // Move files to selected folder
  async function moveFilesToFolder(destinationPath: string) {
    // Check if destination folder exists
    if (!(await fsAsync.exists(destinationPath))) {
      console.error(`Destination folder does not exist: ${destinationPath}`);
      showToast({
        title: "Error",
        message: `Destination folder does not exist: ${path.basename(destinationPath)}`,
        style: Toast.Style.Failure,
      });
      return;
    }

    setIsLoading(true);

    try {
      // Verify destination folder exists and is a directory
      const stats = await fsAsync.getStats(destinationPath);
      if (!stats?.isDirectory) {
        throw new Error("Destination is not a folder");
      }

      let successCount = 0;
      let failCount = 0;

      // Process files in batches for better performance
      const results = await fsAsync.batchProcess(
        selectedFiles,
        async (filePath) => {
          try {
            const fileName = path.basename(filePath);
            const destFilePath = path.join(destinationPath, fileName);

            // Check if file already exists at destination
            if (await fsAsync.exists(destFilePath)) {
              const overwrite = await confirmAlert({
                title: "Overwrite the existing file?",
                message: fileName + " already exists in " + destinationPath,
              });

              if (!overwrite) {
                return { success: false, skipped: true };
              }

              if (filePath === destFilePath) {
                await showHUD("The source and destination file are the same");
                return { success: false, skipped: true };
              }
            }

            // Move the file with progress tracking
            const result = await fsAsync.moveFile(filePath, destFilePath, {
              overwrite: true,
              onProgress: (percent) => {
                // Update progress toast for large files
                if (percent % 10 === 0) {
                  // Update every 10%
                  showToast({
                    title: `Moving ${fileName}`,
                    message: `${Math.round(percent)}% complete`,
                    style: Toast.Style.Animated,
                  });
                }
              },
            });

            return result;
          } catch (error) {
            console.error(`Error moving file ${filePath}:`, error);
            return { success: false, error };
          }
        },
        {
          concurrency: 3,
          onProgress: (completed, total) => {
            showToast({
              title: `Moving Files`,
              message: `${completed}/${total} files processed`,
              style: Toast.Style.Animated,
            });
          },
        }
      );

      // Count successes and failures
      results.forEach((result) => {
        if (result.success) {
          successCount++;
        } else if (!("skipped" in result && result.skipped)) {
          failCount++;
        }
      });

      // Update recent folders with this destination
      const destinationFolder =
        folders.find((f) => f.path === destinationPath) || recentFolders.find((f) => f.path === destinationPath);

      if (destinationFolder) {
        addToRecentFolders(destinationFolder);
      } else if (destinationPath === currentPath) {
        // If the destination is the current navigation path, add it to recent folders
        const stats = await fsAsync.getStats(destinationPath);
        if (stats?.isDirectory) {
          const navFolder: SpotlightSearchResult = {
            path: destinationPath,
            kMDItemFSName: path.basename(destinationPath),
            kMDItemKind: "Folder",
            kMDItemFSSize: 0,
            kMDItemFSCreationDate: stats.birthtime,
            kMDItemContentModificationDate: stats.mtime,
            kMDItemLastUsedDate: stats.atime,
            kMDItemUseCount: 0,
          };

          addToRecentFolders(navFolder);
        }
      }

      // Show success/failure toast
      if (successCount > 0) {
        showToast({
          title: `Moved ${successCount} file${successCount !== 1 ? "s" : ""}`,
          message: failCount > 0 ? `Failed to move ${failCount} file${failCount !== 1 ? "s" : ""}` : "",
          style: failCount > 0 ? Toast.Style.Failure : Toast.Style.Success,
        });

        // Close the window after successful move
        popToRoot({ clearSearchBar: true });
        closeMainWindow({ clearRootSearch: true });
      } else {
        showToast({
          title: "Failed to move files",
          message: "No files were moved successfully",
          style: Toast.Style.Failure,
        });
      }
    } catch (error) {
      console.error("Error moving files:", error);
      showToast({
        title: "Error",
        message: "Failed to move files",
        style: Toast.Style.Failure,
      });
    }

    setIsLoading(false);
  }

  // Copy files to selected folder
  async function copyFilesToFolder(destinationPath: string) {
    // Check if destination folder exists
    if (!(await fsAsync.exists(destinationPath))) {
      console.error(`Destination folder does not exist: ${destinationPath}`);
      showToast({
        title: "Error",
        message: `Destination folder does not exist: ${path.basename(destinationPath)}`,
        style: Toast.Style.Failure,
      });
      return;
    }

    setIsLoading(true);

    try {
      // Verify destination folder exists and is a directory
      const stats = await fsAsync.getStats(destinationPath);
      if (!stats?.isDirectory) {
        throw new Error("Destination is not a folder");
      }

      let successCount = 0;
      let failCount = 0;

      // Process files in batches for better performance
      const results = await fsAsync.batchProcess(
        selectedFiles,
        async (filePath) => {
          try {
            const fileName = path.basename(filePath);
            const destFilePath = path.join(destinationPath, fileName);

            // Check if file already exists at destination
            if (await fsAsync.exists(destFilePath)) {
              const overwrite = await confirmAlert({
                title: "Overwrite the existing file?",
                message: fileName + " already exists in " + destinationPath,
              });

              if (!overwrite) {
                return { success: false, skipped: true };
              }

              if (filePath === destFilePath) {
                await showHUD("The source and destination file are the same");
                return { success: false, skipped: true };
              }
            }

            // Copy the file with progress tracking
            const result = await fsAsync.copyFile(filePath, destFilePath, {
              overwrite: true,
              onProgress: (percent) => {
                // Update progress toast for large files
                if (percent % 10 === 0) {
                  // Update every 10%
                  showToast({
                    title: `Copying ${fileName}`,
                    message: `${Math.round(percent)}% complete`,
                    style: Toast.Style.Animated,
                  });
                }
              },
            });

            return result;
          } catch (error) {
            console.error(`Error copying file ${filePath}:`, error);
            return { success: false, error };
          }
        },
        {
          concurrency: 3,
          onProgress: (completed, total) => {
            showToast({
              title: `Copying Files`,
              message: `${completed}/${total} files processed`,
              style: Toast.Style.Animated,
            });
          },
        }
      );

      // Count successes and failures
      results.forEach((result) => {
        if (result.success) {
          successCount++;
        } else if (!("skipped" in result && result.skipped)) {
          failCount++;
        }
      });

      // Update recent folders with this destination
      const destinationFolder =
        folders.find((f) => f.path === destinationPath) || recentFolders.find((f) => f.path === destinationPath);

      if (destinationFolder) {
        addToRecentFolders(destinationFolder);
      } else if (destinationPath === currentPath) {
        // If the destination is the current navigation path, add it to recent folders
        const stats = await fsAsync.getStats(destinationPath);
        if (stats?.isDirectory) {
          const navFolder: SpotlightSearchResult = {
            path: destinationPath,
            kMDItemFSName: path.basename(destinationPath),
            kMDItemKind: "Folder",
            kMDItemFSSize: 0,
            kMDItemFSCreationDate: stats.birthtime,
            kMDItemContentModificationDate: stats.mtime,
            kMDItemLastUsedDate: stats.atime,
            kMDItemUseCount: 0,
          };

          addToRecentFolders(navFolder);
        }
      }

      // Show success/failure toast
      if (successCount > 0) {
        showToast({
          title: `Copied ${successCount} file${successCount !== 1 ? "s" : ""}`,
          message: failCount > 0 ? `Failed to copy ${failCount} file${failCount !== 1 ? "s" : ""}` : "",
          style: failCount > 0 ? Toast.Style.Failure : Toast.Style.Success,
        });

        // Close the window after successful copy
        popToRoot({ clearSearchBar: true });
        closeMainWindow({ clearRootSearch: true });
      } else {
        showToast({
          title: "Failed to copy files",
          message: "No files were copied successfully",
          style: Toast.Style.Failure,
        });
      }
    } catch (error) {
      console.error("Error copying files:", error);
      showToast({
        title: "Error",
        message: "Failed to copy files",
        style: Toast.Style.Failure,
      });
    }

    setIsLoading(false);
  }

  // Load folder contents
  function loadFolderContents(folderPath: string) {
    try {
      const contents = fs.readdirSync(folderPath);
      const folderContents: SpotlightSearchResult[] = [];

      for (const item of contents) {
        const itemPath = path.join(folderPath, item);

        try {
          const stats = fs.statSync(itemPath);

          if (stats.isDirectory()) {
            folderContents.push({
              path: itemPath,
              kMDItemFSName: item,
              kMDItemDisplayName: item,
              kMDItemKind: "Folder",
              kMDItemFSSize: 0,
              kMDItemFSCreationDate: stats.birthtime,
              kMDItemContentModificationDate: stats.mtime,
              kMDItemLastUsedDate: stats.atime,
              kMDItemUseCount: 0,
            });
          }
        } catch (error) {
          console.error(`Error reading item ${itemPath}:`, error);
        }
      }

      return folderContents.sort((a, b) => a.kMDItemFSName.localeCompare(b.kMDItemFSName));
    } catch (error) {
      console.error(`Error reading folder ${folderPath}:`, error);
      showToast({
        title: "Error",
        message: "Failed to read folder contents",
        style: Toast.Style.Failure,
      });
      return [];
    }
  }

  // Load subfolders whenever currentPath changes
  useEffect(() => {
    if (currentPath && fs.existsSync(currentPath)) {
      const folderContents = loadFolderContents(currentPath);
      setFolders(folderContents);
      // Select the first folder if available
      if (folderContents.length > 0) {
        setSelectedItemId(`subfolder-${folderContents[0].path}-0`);
      }
    }
  }, [currentPath]);

  // Reset selection when search results change
  useEffect(() => {
    if (folders.length > 0) {
      setSelectedItemId(`subfolder-${folders[0].path}-0`);
    } else {
      setSelectedItemId(undefined);
    }
  }, [folders]);

  // Navigate to a folder (for browsing)
  function navigateToFolder(folderPath: string) {
    // Check if folder exists before attempting to navigate
    if (!fs.existsSync(folderPath)) {
      console.error(`Folder does not exist: ${folderPath}`);
      showToast({
        title: "Error",
        message: `Folder does not exist: ${path.basename(folderPath)}`,
        style: Toast.Style.Failure,
      });
      return;
    }

    setCurrentPath(folderPath);
    setSearchText("");
  }

  // Go up one level
  function navigateUp() {
    if (currentPath) {
      const parentPath = path.dirname(currentPath);
      // Check if parent path exists before navigating
      if (fs.existsSync(parentPath)) {
        navigateToFolder(parentPath);
      } else {
        console.error(`Parent folder does not exist: ${parentPath}`);
        showToast({
          title: "Error",
          message: `Cannot navigate up: folder does not exist`,
          style: Toast.Style.Failure,
        });
      }
    }
  }

  // Load pinned folders
  useEffect(() => {
    loadPinnedFolders();
  }, []);

  async function loadPinnedFolders() {
    try {
      const folders = await cacheManager.getPinnedFolders();
      setPinnedFolders(folders);
    } catch (error) {
      console.error("Error loading pinned folders:", error);
    }
  }

  async function pinFolder(folder: SpotlightSearchResult) {
    try {
      await cacheManager.pinFolder(folder);
      await loadPinnedFolders();
      showToast({
        style: Toast.Style.Success,
        title: "Folder Pinned",
        message: folderName(folder),
      });
    } catch (error) {
      console.error("Error pinning folder:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to pin folder",
      });
    }
  }

  async function unpinFolder(folder: SpotlightSearchResult) {
    try {
      await cacheManager.unpinFolder(folder.path);
      await loadPinnedFolders();
      showToast({
        style: Toast.Style.Success,
        title: "Folder Unpinned",
        message: folderName(folder),
      });
    } catch (error) {
      console.error("Error unpinning folder:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to unpin folder",
      });
    }
  }

  // Update the navigation title based on the mode
  const navigationTitle = isCopyMode
    ? `Copy ${selectedFiles.length} file${selectedFiles.length !== 1 ? "s" : ""} to folder`
    : `Move ${selectedFiles.length} file${selectedFiles.length !== 1 ? "s" : ""} to folder`;

  return (
    <List
      isLoading={isLoading || isQuerying}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search folders or navigate..."
      throttle
      navigationTitle={navigationTitle}
      isShowingDetail={isShowingDetail}
      selectedItemId={selectedItemId}
    >
      {selectionError ? (
        <List.EmptyView
          title="File Selection Required"
          description={selectionError}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                onAction={() => {
                  setIsLoading(true);
                  setSelectionError(null);
                  getSelectedFinderFiles();
                }}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {selectedFiles.length > 0 && (
            <List.Section title="Selected Files">
              {selectedFiles.map((filePath, index) => (
                <List.Item
                  key={`file-${index}`}
                  title={path.basename(filePath)}
                  subtitle={path.dirname(filePath)}
                  icon={Icon.Document}
                />
              ))}
            </List.Section>
          )}

          {currentPath && (
            <List.Section title="Navigation">
              <List.Item
                title="Go Up One Level"
                subtitle={path.dirname(currentPath)}
                icon={Icon.ArrowUp}
                actions={
                  <ActionPanel>
                    <Action title="Go Up" onAction={navigateUp} />
                  </ActionPanel>
                }
              />
              <List.Item
                title={path.basename(currentPath)}
                subtitle={currentPath}
                icon={Icon.Folder}
                actions={
                  <ActionPanel>
                    <Action
                      title="Navigate to Folder"
                      onAction={() => navigateToFolder(currentPath)}
                      icon={Icon.ChevronRight}
                    />
                    <Action
                      title={isCopyMode ? "Copy Files Here" : "Move Files Here"}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                      onAction={() => (isCopyMode ? copyFilesToFolder(currentPath) : moveFilesToFolder(currentPath))}
                      icon={isCopyMode ? Icon.Duplicate : Icon.ArrowRightCircle}
                    />
                    <Action
                      title={isCopyMode ? "Move Files Here" : "Copy Files Here"}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
                      onAction={() => (isCopyMode ? moveFilesToFolder(currentPath) : copyFilesToFolder(currentPath))}
                      icon={isCopyMode ? Icon.Duplicate : Icon.ArrowRightCircle}
                    />
                    <Action
                      title="Toggle Details"
                      icon={Icon.Sidebar}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                      onAction={() => setIsShowingDetail(!isShowingDetail)}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}

          <List.Section title={currentPath ? "Subfolders" : searchText ? "Search Results" : "Search for a folder"}>
            {folders.map((folder, index) => (
              <List.Item
                key={`subfolder-${folder.path}-${index}`}
                id={`subfolder-${folder.path}-${index}`}
                title={folderName(folder)}
                subtitle={folder.path}
                icon={Icon.Folder}
                accessories={[
                  {
                    text: folder.kMDItemContentModificationDate
                      ? `Modified: ${folder.kMDItemContentModificationDate.toLocaleDateString()}`
                      : "",
                    tooltip: folder.kMDItemContentModificationDate
                      ? `Modified: ${folder.kMDItemContentModificationDate.toLocaleString()}`
                      : "",
                  },
                ]}
                detail={
                  <List.Item.Detail
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Metadata" />
                        <List.Item.Detail.Metadata.Label title="Name" text={folder.kMDItemFSName} />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Where" text={folder.path} />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Type" text={folder.kMDItemKind} />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Created"
                          text={folder.kMDItemFSCreationDate?.toLocaleString()}
                        />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Modified"
                          text={folder.kMDItemContentModificationDate?.toLocaleString()}
                        />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Last used"
                          text={folder.kMDItemLastUsedDate?.toLocaleString() || "-"}
                        />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <Action
                      title="Navigate to Folder"
                      onAction={() => navigateToFolder(folder.path)}
                      icon={Icon.ChevronRight}
                    />
                    <Action
                      title={isCopyMode ? "Copy Files Here" : "Move Files Here"}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                      onAction={() => (isCopyMode ? copyFilesToFolder(folder.path) : moveFilesToFolder(folder.path))}
                      icon={isCopyMode ? Icon.Duplicate : Icon.ArrowRightCircle}
                    />
                    <Action
                      title={isCopyMode ? "Move Files Here" : "Copy Files Here"}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
                      onAction={() => (isCopyMode ? moveFilesToFolder(folder.path) : copyFilesToFolder(folder.path))}
                      icon={isCopyMode ? Icon.Duplicate : Icon.ArrowRightCircle}
                    />
                    <Action
                      title="Toggle Details"
                      icon={Icon.Sidebar}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                      onAction={() => setIsShowingDetail(!isShowingDetail)}
                    />
                    <Action
                      icon={Icon.Star}
                      title="Pin This Folder"
                      onAction={() => pinFolder(folder)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>

          {!searchText && pinnedFolders.length > 0 && (
            <List.Section title="Pinned Folders">
              {pinnedFolders.map((folder, index) => (
                <List.Item
                  key={`pinned-${folder.path}-${index}`}
                  id={`pinned-${folder.path}-${index}`}
                  title={folderName(folder)}
                  subtitle={folder.path}
                  icon={Icon.Star}
                  accessories={[
                    {
                      text: folder.pinnedAt ? `Pinned: ${folder.pinnedAt.toLocaleDateString()}` : "",
                      tooltip: folder.pinnedAt ? `Pinned: ${folder.pinnedAt.toLocaleString()}` : "",
                    },
                  ]}
                  detail={
                    <List.Item.Detail
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label title="Metadata" />
                          <List.Item.Detail.Metadata.Label title="Name" text={folder.kMDItemFSName} />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label title="Where" text={folder.path} />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label title="Type" text={folder.kMDItemKind} />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title="Created"
                            text={folder.kMDItemFSCreationDate?.toLocaleString()}
                          />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title="Modified"
                            text={folder.kMDItemContentModificationDate?.toLocaleString()}
                          />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title="Last used"
                            text={folder.kMDItemLastUsedDate?.toLocaleString() || "-"}
                          />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title="Pinned"
                            text={folder.pinnedAt?.toLocaleString() || "-"}
                          />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <Action
                        title="Navigate to Folder"
                        onAction={() => navigateToFolder(folder.path)}
                        icon={Icon.ChevronRight}
                      />
                      <Action
                        title={isCopyMode ? "Copy Files Here" : "Move Files Here"}
                        shortcut={{ modifiers: ["cmd"], key: "return" }}
                        onAction={() => (isCopyMode ? copyFilesToFolder(folder.path) : moveFilesToFolder(folder.path))}
                        icon={isCopyMode ? Icon.Duplicate : Icon.ArrowRightCircle}
                      />
                      <Action
                        title={isCopyMode ? "Move Files Here" : "Copy Files Here"}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
                        onAction={() => (isCopyMode ? moveFilesToFolder(folder.path) : copyFilesToFolder(folder.path))}
                        icon={isCopyMode ? Icon.ArrowRightCircle : Icon.Duplicate}
                      />
                      <Action
                        title="Toggle Details"
                        icon={Icon.Sidebar}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                        onAction={() => setIsShowingDetail(!isShowingDetail)}
                      />
                      <Action
                        icon={Icon.StarDisabled}
                        style={Action.Style.Destructive}
                        title="Unpin This Folder"
                        onAction={() => unpinFolder(folder)}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}

          {!searchText && recentFolders.length > 0 && (
            <List.Section title="Recent Folders">
              {recentFolders.map((folder, index) => (
                <List.Item
                  key={`recent-${folder.path}-${index}`}
                  id={`recent-${folder.path}-${index}`}
                  title={folderName(folder)}
                  subtitle={folder.path}
                  icon={Icon.Clock}
                  accessories={[
                    {
                      text: folder.lastUsed ? `Last used: ${folder.lastUsed.toLocaleDateString()}` : "",
                      tooltip: folder.lastUsed ? `Last used: ${folder.lastUsed.toLocaleString()}` : "",
                    },
                  ]}
                  detail={
                    <List.Item.Detail
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label title="Metadata" />
                          <List.Item.Detail.Metadata.Label title="Name" text={folder.kMDItemFSName} />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label title="Where" text={folder.path} />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label title="Type" text={folder.kMDItemKind} />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title="Created"
                            text={folder.kMDItemFSCreationDate?.toLocaleString()}
                          />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title="Modified"
                            text={folder.kMDItemContentModificationDate?.toLocaleString()}
                          />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title="Last used"
                            text={folder.lastUsed?.toLocaleString() || "-"}
                          />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <Action
                        title="Navigate to Folder"
                        onAction={() => navigateToFolder(folder.path)}
                        icon={Icon.ChevronRight}
                      />
                      <Action
                        title={isCopyMode ? "Copy Files Here" : "Move Files Here"}
                        shortcut={{ modifiers: ["cmd"], key: "return" }}
                        onAction={() => (isCopyMode ? copyFilesToFolder(folder.path) : moveFilesToFolder(folder.path))}
                        icon={isCopyMode ? Icon.Duplicate : Icon.ArrowRightCircle}
                      />
                      <Action
                        title={isCopyMode ? "Move Files Here" : "Copy Files Here"}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
                        onAction={() => (isCopyMode ? moveFilesToFolder(folder.path) : copyFilesToFolder(folder.path))}
                        icon={isCopyMode ? Icon.ArrowRightCircle : Icon.Duplicate}
                      />
                      <Action
                        title="Toggle Details"
                        icon={Icon.Sidebar}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                        onAction={() => setIsShowingDetail(!isShowingDetail)}
                      />
                      <Action
                        icon={Icon.Star}
                        title="Pin This Folder"
                        onAction={() => pinFolder(folder)}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                      />
                      <Action
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        title="Remove This Recent Folder"
                        onAction={() => removeFromRecentFolders(folder.path)}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
