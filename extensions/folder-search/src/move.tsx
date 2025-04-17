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
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { folderName } from "./utils";
import { SpotlightSearchResult } from "./types";
import { useFolderSearch } from "./hooks/useFolderSearch";
import { FolderListSection, Directory } from "./components";
import path from "node:path";
import fse from "fs-extra";
import { userInfo } from "os";
import { useEffect } from "react";

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
  useEffect(() => {
    if (props.fallbackText) {
      setSearchText(props.fallbackText);
    }
  }, [props.fallbackText]);

  // Log launch type for debugging
  useEffect(() => {
    console.log("🚀 Command launched with:", {
      launchType: props.launchType,
      fallbackText: props.fallbackText,
      searchText
    });
  }, [props.launchType, props.fallbackText, searchText]);

  // Function to move selected Finder items to the selected folder
  const moveSelectedFinderItemsToFolder = async (destinationFolder: string) => {
    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      await showFailureToast({ title: "No Finder selection to move" });
      return false;
    }

    let movedCount = 0;
    let skippedCount = 0;

    for (const item of selectedItems) {
      const sourceFileName = path.basename(item.path);
      const destinationFile = path.join(destinationFolder, sourceFileName);

      try {
        const exists = await fse.pathExists(destinationFile);
        if (exists) {
          const overwrite = await confirmAlert({
            title: "Overwrite the existing file?",
            message: sourceFileName + " already exists in " + destinationFolder,
          });

          if (overwrite) {
            if (item.path === destinationFile) {
              await showFailureToast({ title: "The source and destination file are the same" });
              skippedCount++;
              continue;
            }
            await fse.move(item.path, destinationFile, { overwrite: true });
            movedCount++;
          } else {
            await showFailureToast({ title: "Cancelling move for " + sourceFileName });
            skippedCount++;
            continue;
          }
        } else {
          await fse.move(item.path, destinationFile);
          movedCount++;
        }
      } catch (e) {
        await showFailureToast(e, { title: "Error moving file" });
        return false;
      }
    }

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
              await showFailureToast({ title: "Moved to Trash", message: folderName(result) });
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
        <FolderListSection
          title="Results"
          results={results}
          isShowingDetail={isShowingDetail}
          resultIsPinned={resultIsPinned}
          renderActions={renderFolderActions}
        />
      )}
    </List>
  );
}
