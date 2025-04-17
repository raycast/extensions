import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  closeMainWindow,
  popToRoot,
  confirmAlert,
  open,
  getSelectedFinderItems,
  Keyboard,
  LaunchProps,
} from "@raycast/api";
import { folderName, copyFolderToClipboard, maybeMoveResultToTrash, log } from "./utils";
import { runAppleScript } from "run-applescript";
import { SpotlightSearchResult } from "./types";
import { useFolderSearch } from "./hooks/useFolderSearch";
import { FolderListSection, Directory } from "./components";
import path from "node:path";
import fse from "fs-extra";
import { userInfo } from "os";
import { showFailureToast } from "@raycast/utils";
import { useEffect } from "react";

// allow string indexing on Icons
interface IconDictionary {
  [id: string]: Icon;
}

const IconDictionaried: IconDictionary = Icon as IconDictionary;

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
    plugins,
    resultIsPinned,
    toggleResultPinnedStatus,
    removeResultFromPinnedResults,
    movePinUp,
    movePinDown,
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
    log("debug", "search", "Command launched", {
      launchType: props.launchType,
      fallbackText: props.fallbackText,
      searchText,
    });
  }, [props.launchType, props.fallbackText, searchText]);

  const sendFinderSelectionToFolder = async (destinationFolder: string) => {
    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      await showFailureToast({ title: "No Finder selection to send" });
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
              await showFailureToast({ title: "The source and destination file are the same" });
              continue;
            }
            fse.moveSync(item.path, destinationFile, { overwrite: true });
            await showFailureToast({ title: `Moved ${path.basename(item.path)} to ${destinationFolder}` });
          } else {
            await showFailureToast({ title: "Cancelling move" });
          }
        } else {
          fse.moveSync(item.path, destinationFile);
          await showFailureToast({ title: `Moved ${sourceFileName} to ${destinationFolder}` });
        }

        open(destinationFolder);
      } catch (e) {
        await showFailureToast(e, { title: "Error moving file" });
      }
    }

    closeMainWindow();
    popToRoot({ clearSearchBar: true });
  };

  // Render actions for the folder list items
  const renderFolderActions = (result: SpotlightSearchResult, resultIndex: number) => {
    const enclosingFolder = path.dirname(result.path);
    return (
      <ActionPanel title={folderName(result)}>
        <Action.Open
          title="Open in Finder"
          icon={Icon.Folder}
          target={result.path}
          onOpen={() => popToRoot({ clearSearchBar: true })}
        />
        <Action
          title="Move Finder Selection"
          icon={Icon.NewFolder}
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          onAction={() => sendFinderSelectionToFolder(result.path)}
        />
        <Action.OpenWith
          title="Open With…"
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          path={result.path}
          onOpen={() => popToRoot({ clearSearchBar: true })}
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
              description="Looking for matching folders"
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
