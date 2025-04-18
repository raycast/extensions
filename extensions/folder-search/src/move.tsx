import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  closeMainWindow,
  popToRoot,
  confirmAlert,
  open,
  getSelectedFinderItems,
  LaunchProps,
  showToast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { folderName, log } from "./utils";
import { SpotlightSearchResult } from "./types";
import { useFolderSearch } from "./hooks/useFolderSearch";
import { FolderListSection, Directory } from "./components";
import path from "node:path";
import fse from "fs-extra";
import { userInfo } from "os";
import { useEffect, useRef } from "react";

export default function Command(props: LaunchProps) {
  const {
    searchText,
    setSearchText,
    results,
    isQuerying,
    isShowingDetail,
    setIsShowingDetail,
    searchScope,
    setSearchScope,
    selectedItemId,
    pinnedResults,
    resultIsPinned,
    hasCheckedPlugins,
    hasCheckedPreferences,
  } = useFolderSearch();

  // Handle fallback text from root search
  const fallbackTextRef = useRef<string | undefined>(undefined);
  const fallbackTextProcessedRef = useRef<boolean>(false);
  
  useEffect(() => {
    // Only process fallbackText once per session
    if (props.fallbackText && !fallbackTextProcessedRef.current) {
      log("debug", "move", "Processing fallback text", {
        fallbackText: props.fallbackText,
        component: "move",
        timestamp: new Date().toISOString(),
      });
      
      fallbackTextRef.current = props.fallbackText;
      fallbackTextProcessedRef.current = true;
      setSearchText(props.fallbackText);
    }
  }, [props.fallbackText]);

  // Log launch type for debugging
  const hasLoggedLaunchRef = useRef<boolean>(false);
  
  useEffect(() => {
    if (!hasLoggedLaunchRef.current) {
      log("debug", "move", "Command launched", {
        launchType: props.launchType,
        fallbackText: props.fallbackText,
        searchText,
        component: "move",
        timestamp: new Date().toISOString(),
      });
      hasLoggedLaunchRef.current = true;
    }
  }, [props.launchType, props.fallbackText, searchText]);

  // Function to move selected Finder items to the selected folder
  const moveSelectedFinderItemsToFolder = async (destinationFolder: string) => {
    try {
      log("debug", "move", "Starting move operation", {
        destinationFolder,
      });

      const selectedItems = await getSelectedFinderItems();
      log("debug", "move", "Got selected Finder items", {
        count: selectedItems.length,
        items: selectedItems.map(item => item.path),
      });

      if (selectedItems.length === 0) {
        log("debug", "move", "No Finder items selected");
        await showFailureToast({ title: "No Finder selection to move" });
        return false;
      }

      let movedCount = 0;
      let skippedCount = 0;

      for (const item of selectedItems) {
        const sourceFileName = path.basename(item.path);
        const destinationFile = path.join(destinationFolder, sourceFileName);

        try {
          log("debug", "move", "Processing item", {
            source: item.path,
            destination: destinationFile,
          });

          const exists = await fse.pathExists(destinationFile);
          if (exists) {
            log("debug", "move", "File exists at destination", {
              file: destinationFile,
            });

            const overwrite = await confirmAlert({
              title: "Overwrite the existing file?",
              message: sourceFileName + " already exists in " + destinationFolder,
            });

            if (overwrite) {
              if (item.path === destinationFile) {
                log("debug", "move", "Source and destination are the same", {
                  file: item.path,
                });
                await showFailureToast({ title: "The source and destination file are the same" });
                skippedCount++;
                continue;
              }
              await fse.move(item.path, destinationFile, { overwrite: true });
              movedCount++;
              log("debug", "move", "File moved with overwrite", {
                source: item.path,
                destination: destinationFile,
              });
            } else {
              log("debug", "move", "User cancelled overwrite", {
                file: sourceFileName,
              });
              await showFailureToast({ title: "Cancelling move for " + sourceFileName });
              skippedCount++;
              continue;
            }
          } else {
            await fse.move(item.path, destinationFile);
            movedCount++;
            log("debug", "move", "File moved successfully", {
              source: item.path,
              destination: destinationFile,
            });
          }
        } catch (e) {
          log("error", "move", "Error moving file", {
            error: e,
            source: item.path,
            destination: destinationFile,
          });
          await showFailureToast(e, { title: "Error moving file" });
          return false;
        }
      }

      log("debug", "move", "Move operation completed", {
        movedCount,
        skippedCount,
        destinationFolder,
      });

      if (movedCount === 0) {
        await showFailureToast({ title: "No files were moved" });
        return false;
      } else if (skippedCount > 0) {
        await showFailureToast({
          title: `Moved ${movedCount} item(s) to ${path.basename(destinationFolder)}, skipped ${skippedCount} item(s)`,
        });
      } else {
        await showFailureToast({ title: `Moved ${movedCount} item(s) to ${path.basename(destinationFolder)}` });
      }

      return movedCount > 0;
    } catch (error) {
      log("error", "move", "Unexpected error in move operation", {
        error,
        destinationFolder,
      });
      throw error;
    }
  };

  // Render actions for the folder list items
  const renderFolderActions = (result: SpotlightSearchResult) => {
    const enclosingFolder = path.dirname(result.path);
    return (
      <ActionPanel title={folderName(result)}>
        <Action
          title="Move to This Folder"
          icon={Icon.ArrowRight}
          shortcut={{ modifiers: ["cmd"], key: "return" }}
          onAction={async () => {
            const success = await moveSelectedFinderItemsToFolder(result.path);
            if (success) {
              open(result.path);
              closeMainWindow();
              popToRoot({ clearSearchBar: true });
              await showToast({ title: "Successfully moved to folder", message: folderName(result) });
            }
          }}
        />
        <Action.Open
          title="Open in Finder"
          icon={Icon.Folder}
          target={result.path}
          onOpen={() => popToRoot({ clearSearchBar: true })}
        />
        <Action
          title="Toggle Details"
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onAction={() => setIsShowingDetail(!isShowingDetail)}
        />
        <ActionPanel.Section>
          <Action.Push
            title="Enclosing Folder"
            icon={Icon.ArrowUp}
            shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
            target={<Directory path={enclosingFolder} />}
          />
          <Action.Push
            title="Enter Folder"
            icon={Icon.ArrowDown}
            shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
            target={<Directory path={result.path} />}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  };

  return !(hasCheckedPlugins && hasCheckedPreferences) ? (
    // prevent flicker due to details pref being async
    <Form />
  ) : (
    <List
      isLoading={isQuerying}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for destination folder to move files"
      isShowingDetail={isShowingDetail}
      throttle={true}
      searchText={searchText}
      selectedItemId={selectedItemId}
      searchBarAccessory={
        hasCheckedPlugins && hasCheckedPreferences ? (
          <List.Dropdown tooltip="Scope" onChange={setSearchScope} value={searchScope}>
            <List.Dropdown.Item title="Pinned" value="pinned" />
            <List.Dropdown.Item title="This Mac" value="" />
            <List.Dropdown.Item title={`User (${userInfo().username})`} value={userInfo().homedir} />
          </List.Dropdown>
        ) : null
      }
    >
      {!searchText && props.launchType === "userInitiated" ? (
        <FolderListSection
          title="Pinned"
          results={pinnedResults}
          isShowingDetail={isShowingDetail}
          resultIsPinned={resultIsPinned}
          renderActions={renderFolderActions}
        />
      ) : (
        <>
          {isQuerying ? (
            <List.EmptyView
              title="Searching..."
              description="Looking for destination folders"
              icon={Icon.MagnifyingGlass}
            />
          ) : results.length === 0 ? (
            <List.EmptyView title="No Results" description="Try a different search term" icon={Icon.Folder} />
          ) : (
            <FolderListSection
              title="Results"
              results={results}
              isShowingDetail={isShowingDetail}
              resultIsPinned={resultIsPinned}
              renderActions={renderFolderActions}
            />
          )}
        </>
      )}
    </List>
  );
}
