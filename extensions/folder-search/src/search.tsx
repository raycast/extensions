import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  closeMainWindow,
  popToRoot,
  open,
  Keyboard,
  LaunchProps,
  getPreferenceValues,
} from "@raycast/api";
import React, { useRef } from "react";
import { folderName, copyFolderToClipboard, maybeMoveResultToTrash, log, logDiagnostics } from "./utils";
import { runAppleScript } from "run-applescript";
import { SpotlightSearchResult, SpotlightSearchPreferences } from "./types";
import { useFolderSearch } from "./hooks/useFolderSearch";
import { moveFinderItems } from "./moveUtils";
import { FolderListSection, Directory } from "./components";
import path from "path";
import { userInfo } from "os";
import { showFailureToast } from "@raycast/utils";

// allow string indexing on Icons
interface IconDictionary {
  [id: string]: Icon;
}

const IconDictionaried: IconDictionary = Icon as IconDictionary;

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
    plugins,
    resultIsPinned,
    toggleResultPinnedStatus,
    removeResultFromPinnedResults,
    movePinUp,
    movePinDown,
    hasCheckedPlugins,
    hasCheckedPreferences,
    refreshPinsFromStorage,
    hasSearched,
  } = useFolderSearch();

  // Use a ref to track if we've logged
  const hasLoggedRef = useRef(false);

  // Simple launch logging - only once per mount
  React.useEffect(() => {
    if (!hasLoggedRef.current) {
      log("debug", "search", "Command launched", {
        searchText,
        timestamp: new Date().toISOString(),
      });
      hasLoggedRef.current = true;
    }
  }, []); // Empty dependency array ensures this only runs once

  // Handle returning from directory view
  const handleReturnFromDirectory = () => {
    log("debug", "search", `handleReturnFromDirectory called with ${pinnedResults.length} current pins`);

    // Add a short timestamp to help correlate logs
    const timestamp = new Date().toISOString().slice(11, 23);
    log("debug", "search", `[${timestamp}] Refreshing pins from storage via directory return`);

    // Run full diagnostics before refreshing pins
    logDiagnostics("search", "Pre-refresh state diagnostics");

    // Let refreshPinsFromStorage handle everything, including pending states
    refreshPinsFromStorage();

    // Add debug logs to check state after a short delay
    setTimeout(() => {
      log("debug", "search", `[${timestamp}+250ms] Pin count after refresh: ${pinnedResults.length}`);
      // Run diagnostics again after refresh
      logDiagnostics("search", "Post-refresh state diagnostics");
    }, 250);
  };

  // Render actions for the folder list items
  const renderFolderActions = (result: SpotlightSearchResult, resultIndex: number, isPinnedSection = false) => {
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
        <Action.OpenWith
          title="Open with…"
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
            target={<Directory path={enclosingFolder} onReturn={handleReturnFromDirectory} />}
          />
          <Action.Push
            title="Enter Folder"
            icon={Icon.ArrowDown}
            shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
            target={<Directory path={result.path} onReturn={handleReturnFromDirectory} />}
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
              pluginIndex: number,
            ) => (
              <Action
                key={pluginIndex}
                title={plugin.title}
                icon={IconDictionaried[plugin.icon] || plugin.icon}
                shortcut={{ ...plugin.shortcut }}
                onAction={() => {
                  // Debug logging to see which plugin is failing
                  log("debug", "search", "Plugin action triggered", {
                    title: plugin.title,
                    appleScriptType: typeof plugin.appleScript,
                    isFunction: typeof plugin.appleScript === "function",
                  });

                  try {
                    popToRoot({ clearSearchBar: true });
                    closeMainWindow({ clearRootSearch: true });
                    runAppleScript(plugin.appleScript(result));
                  } catch (error) {
                    // Show user-friendly error message
                    showFailureToast(error, { title: `Plugin "${plugin.title}" failed` });
                    // Keep debug logging for developers
                    log("error", "search", "Plugin execution failed", {
                      title: plugin.title,
                      error: error instanceof Error ? error.message : String(error),
                      appleScriptType: typeof plugin.appleScript,
                    });
                  }
                }}
              />
            ),
          )}
        </ActionPanel.Section>
      </ActionPanel>
    );
  };

  return (
    <List
      isLoading={!(hasCheckedPlugins && hasCheckedPreferences)}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search folders"
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
          description="Search to find folders or pin your favorites"
          icon={Icon.Star}
        />
      ) : (
        <>
          {isQuerying ? (
            <List.EmptyView
              title="Searching..."
              description="Looking for matching folders"
              icon={Icon.MagnifyingGlass}
            />
          ) : searchText && !hasSearched ? (
            <List.EmptyView
              title="Searching..."
              description="Looking for matching folders"
              icon={Icon.MagnifyingGlass}
            />
          ) : props.fallbackText && !hasSearched ? (
            <List.EmptyView
              title="Searching..."
              description="Looking for matching folders"
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
              description="Type to search for folders"
              icon={Icon.MagnifyingGlass}
            />
          )}
        </>
      )}
    </List>
  );
}

export default Command;
