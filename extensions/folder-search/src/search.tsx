import { userInfo } from "os";

import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  Toast,
  closeMainWindow,
  popToRoot,
  showToast,
  confirmAlert,
  open,
  getSelectedFinderItems,
  Keyboard,
} from "@raycast/api";

import { runAppleScript } from "run-applescript";
import path from "node:path";
import fse from "fs-extra";

import { SpotlightSearchResult } from "./types";

import { folderName, showFolderInfoInFinder, copyFolderToClipboard, maybeMoveResultToTrash } from "./utils";

import { useFolderSearch } from "./hooks/useFolderSearch";
import { FolderListSection } from "./components/FolderListSection";

// allow string indexing on Icons
interface IconDictionary {
  [id: string]: Icon;
}

const IconDictionaried: IconDictionary = Icon as IconDictionary;

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
    plugins,
    resultIsPinned,
    toggleResultPinnedStatus,
    removeResultFromPinnedResults,
    movePinUp,
    movePinDown,
    hasCheckedPlugins,
    hasCheckedPreferences,
  } = useFolderSearch();

  const sendFinderSelectionToFolder = async (destinationFolder: string) => {
    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      await showToast(Toast.Style.Failure, "No Finder selection to send");
      return;
    }

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
              await showToast(Toast.Style.Failure, "The source and destination file are the same");
              continue;
            }
            fse.moveSync(item.path, destinationFile, { overwrite: true });
            await showToast(Toast.Style.Success, "Moved file " + path.basename(item.path) + " to " + destinationFolder);
          } else {
            await showToast(Toast.Style.Failure, "Cancelling move");
          }
        } else {
          fse.moveSync(item.path, destinationFile);
          await showToast(Toast.Style.Success, "Moved file " + sourceFileName + " to " + destinationFolder);
        }

        open(destinationFolder);
      } catch (e) {
        console.error("ERROR " + String(e));
        await showToast(Toast.Style.Failure, "Error moving file " + String(e));
      }
    }

    closeMainWindow();
    popToRoot({ clearSearchBar: true });
  };

  // Render actions for the folder list items
  const renderFolderActions = (result: SpotlightSearchResult, resultIndex: number) => {
    return (
      <ActionPanel title={folderName(result)}>
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
          title="Send Finder selection to Folder"
          icon={Icon.Folder}
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          onAction={() => sendFinderSelectionToFolder(result.path)}
        />
        <Action.OpenWith
          title="Open With..."
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          path={result.path}
          onOpen={() => popToRoot({ clearSearchBar: true })}
        />
        <Action
          title="Show Info in Finder"
          icon={Icon.Finder}
          shortcut={{ modifiers: ["cmd"], key: "i" }}
          onAction={() => showFolderInfoInFinder(result)}
        />
        <Action
          title="Toggle Details"
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onAction={() => setIsShowingDetail(!isShowingDetail)}
        />
        <Action
          title={!resultIsPinned(result) ? "Pin" : "Unpin"}
          icon={!resultIsPinned(result) ? Icon.Star : Icon.StarDisabled}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          onAction={() => toggleResultPinnedStatus(result, resultIndex)}
        />
        {resultIsPinned(result) && (
          <>
            {resultIndex > 0 && (
              <Action
                title="Move Pin Up"
                icon={Icon.ArrowUpCircle}
                shortcut={Keyboard.Shortcut.Common.MoveUp}
                onAction={() => movePinUp(result, resultIndex)}
              />
            )}
            {resultIndex < pinnedResults.length - 1 && (
              <Action
                title="Move Pin Down"
                icon={Icon.ArrowDownCircle}
                shortcut={Keyboard.Shortcut.Common.MoveDown}
                onAction={() => movePinDown(result, resultIndex)}
              />
            )}
          </>
        )}
        <ActionPanel.Section>
          <Action.CopyToClipboard
            title="Copy Folder"
            shortcut={{ modifiers: ["cmd"], key: "." }}
            content={``}
            onCopy={() => copyFolderToClipboard(result)}
          />
          <Action.CopyToClipboard
            title="Copy Name"
            shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            content={folderName(result)}
          />
          <Action.CopyToClipboard
            title="Copy Path"
            shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            content={result.path}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.CreateQuicklink
            title="Create Quicklink"
            icon={Icon.Link}
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
            quicklink={{ link: result.path, name: folderName(result) }}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action
            title="Move to Trash"
            style={Action.Style.Destructive}
            icon={{ source: Icon.Trash, tintColor: Color.Red }}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={() => maybeMoveResultToTrash(result, () => removeResultFromPinnedResults(result))}
          />
        </ActionPanel.Section>
        <ActionPanel.Section title="Plugins">
          {plugins.map(
            (
              plugin: {
                title: string;
                icon: string;
                shortcut: Keyboard.Shortcut;
                appleScript: (result: SpotlightSearchResult) => string;
              },
              pluginIndex: number
            ) => (
              <Action
                key={pluginIndex}
                title={plugin.title}
                icon={IconDictionaried[plugin.icon]}
                shortcut={{ ...plugin.shortcut }}
                onAction={() => {
                  popToRoot({ clearSearchBar: true });
                  closeMainWindow({ clearRootSearch: true });
                  runAppleScript(plugin.appleScript(result));
                }}
              />
            )
          )}
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
      enableFiltering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search folders"
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
