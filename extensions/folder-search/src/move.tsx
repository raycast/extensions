import {
  Action,
  ActionPanel,
  Icon,
  List,
  closeMainWindow,
  popToRoot,
  open,
  Keyboard,
  LaunchProps,
  getPreferenceValues,
} from "@raycast/api";
import React from "react";
import { folderName, log } from "./utils";
import { SpotlightSearchResult, SpotlightSearchPreferences } from "./types";
import { useFolderSearch } from "./hooks/useFolderSearch";
import { moveFinderItems } from "./moveUtils";
import { FolderListSection, Directory } from "./components";
import path from "path";
import { userInfo } from "os";
import { showFailureToast } from "@raycast/utils";

function Command(props: LaunchProps) {
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
    toggleResultPinnedStatus,
    movePinUp,
    movePinDown,
    hasCheckedPlugins,
    hasCheckedPreferences,
    hasSearched,
  } = useFolderSearch();

  // Simple launch logging
  React.useEffect(() => {
    log("debug", "move", "Command launched", {
      searchText,
      timestamp: new Date().toISOString(),
    });
  }, []); // Only log once on mount

  // Render actions for the folder list items
  const renderFolderActions = (result: SpotlightSearchResult, resultIndex: number, isPinnedSection = false) => {
    const enclosingFolder = path.dirname(result.path);
    return (
      <ActionPanel title={folderName(result)}>
        <Action
          title="Move Finder Selection"
          icon={Icon.NewFolder}
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          onAction={async () => {
            try {
              const moveResult = await moveFinderItems(result.path);
              if (moveResult.success) {
                // Only open the folder if the preference is enabled
                const { openFolderAfterMove } = getPreferenceValues<SpotlightSearchPreferences>();
                if (openFolderAfterMove) {
                  open(result.path);
                }
                closeMainWindow();
                popToRoot({ clearSearchBar: true });
              }
            } catch (error) {
              // Show error to user with showFailureToast
              showFailureToast(error, { title: "Could not move Finder selection" });
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
        <Action
          title={!resultIsPinned(result) ? "Pin" : "Unpin"}
          icon={!resultIsPinned(result) ? Icon.Star : Icon.StarDisabled}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          onAction={() => toggleResultPinnedStatus(result)}
        />
        {resultIsPinned(result) && isPinnedSection && (
          <>
            {resultIndex > 0 && (
              <Action
                title="Move Pin up"
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
      </ActionPanel>
    );
  };

  return (
    <List
      isLoading={!(hasCheckedPlugins && hasCheckedPreferences)}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for destination folder to move files"
      isShowingDetail={isShowingDetail}
      throttle={true}
      searchText={searchText}
      selectedItemId={selectedItemId || undefined}
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
      {!(hasCheckedPlugins && hasCheckedPreferences) ? (
        // Show loading state while checking preferences and plugins
        <List.EmptyView title="Loading..." description="Setting up folder search" icon={Icon.MagnifyingGlass} />
      ) : !searchText && !props.fallbackText && pinnedResults.length > 0 ? (
        <FolderListSection
          title="Pinned"
          results={pinnedResults}
          isShowingDetail={isShowingDetail}
          resultIsPinned={resultIsPinned}
          renderActions={renderFolderActions}
          isPinnedSection={true}
        />
      ) : !searchText && !props.fallbackText ? (
        // No pins and no search text (and not fallback mode)
        <List.EmptyView
          title="No Pinned Folders"
          description="Search to find folders or pin your favorites from the search command"
          icon={Icon.Star}
        />
      ) : (
        <>
          {isQuerying ? (
            <List.EmptyView
              title="Searching..."
              description="Looking for destination folders"
              icon={Icon.MagnifyingGlass}
            />
          ) : searchText && !hasSearched ? (
            <List.EmptyView
              title="Searching..."
              description="Looking for destination folders"
              icon={Icon.MagnifyingGlass}
            />
          ) : props.fallbackText && !hasSearched ? (
            <List.EmptyView
              title="Searching..."
              description="Looking for destination folders"
              icon={Icon.MagnifyingGlass}
            />
          ) : hasSearched && results.length === 0 ? (
            <List.EmptyView title="No Results" description="Try a different search term" icon={Icon.Folder} />
          ) : results.length > 0 ? (
            <FolderListSection
              title="Results"
              results={results}
              isShowingDetail={isShowingDetail}
              resultIsPinned={resultIsPinned}
              renderActions={renderFolderActions}
              isPinnedSection={false}
            />
          ) : (
            // Only show this when there's truly no search text and no fallback
            <List.EmptyView
              title="Enter a search term"
              description="Type to search for folders to move files to"
              icon={Icon.MagnifyingGlass}
            />
          )}
        </>
      )}
    </List>
  );
}

export default Command;
