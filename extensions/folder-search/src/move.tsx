import { userInfo } from "os";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  Toast,
  closeMainWindow,
  popToRoot,
  showToast,
  showHUD,
  confirmAlert,
  open,
  getSelectedFinderItems,
} from "@raycast/api";

import path from "node:path";
import fse from "fs-extra";

import { useFolderSearch } from "./hooks/useFolderSearch";
import { FolderListSection } from "./components/FolderListSection";
import { folderName } from "./utils";
import { SpotlightSearchResult } from "./types";

export default function Command() {
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

  // Function to move selected Finder items to the selected folder
  const moveSelectedFinderItemsToFolder = async (destinationFolder: string) => {
    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      await showHUD(`⚠️  No Finder selection to move.`);
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
              await showHUD("The source and destination file are the same");
              skippedCount++;
              continue;
            }
            await fse.move(item.path, destinationFile, { overwrite: true });
            movedCount++;
          } else {
            await showHUD("Cancelling move for " + sourceFileName);
            skippedCount++;
            continue;
          }
        } else {
          await fse.move(item.path, destinationFile);
          movedCount++;
        }
      } catch (e) {
        console.error("ERROR " + String(e));
        await showToast(Toast.Style.Failure, "Error moving file " + String(e));
        return false;
      }
    }

    if (movedCount === 0) {
      await showHUD(`No files were moved`);
      return false;
    } else if (skippedCount > 0) {
      await showHUD(
        `Moved ${movedCount} item(s) to ${path.basename(destinationFolder)}, skipped ${skippedCount} item(s)`
      );
    } else {
      await showHUD(`Moved ${movedCount} item(s) to ${path.basename(destinationFolder)}`);
    }

    return movedCount > 0;
  };

  // Render actions for the folder list items
  const renderFolderActions = (result: SpotlightSearchResult) => {
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
            }
          }}
        />
        <Action.Open
          title="Open"
          icon={Icon.Folder}
          target={result.path}
          onOpen={() => popToRoot({ clearSearchBar: true })}
        />
        <Action.ShowInFinder
          title="Show in Finder"
          path={result.path}
          onShow={() => popToRoot({ clearSearchBar: true })}
        />
        <Action
          title="Toggle Details"
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onAction={() => setIsShowingDetail(!isShowingDetail)}
        />
      </ActionPanel>
    );
  };

  return !(hasCheckedPlugins && hasCheckedPreferences) ? (
    // prevent flicker due to details pref being async
    <Form />
  ) : (
    <List
      isLoading={isQuerying}
      enableFiltering={false}
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
      {!searchText ? (
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
