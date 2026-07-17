import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useState } from "react";
import { basename, join } from "path";
import { existsSync } from "fs";
import { FileManagerActions } from "../actions/FileActions";
import { FileHistoryAction } from "./FileHistoryView";
import { NavigationContext, RepositoryContext } from "../../open-repository";
import { WorkspaceNavigationActions, WorkspaceNavigationDropdown } from "../actions/WorkspaceNavigationActions";
import { FileAttachedLinksAction } from "../actions/StatusActions";
import { CopyToClipboardMenuAction } from "../actions/CopyToClipboardMenuAction";
import { useTrackedFilesSearch } from "../../hooks/useTrackedFilesSearch";
import { GitIgnoreAction } from "../actions/GitIgnoreAction";
import { GitLFSAction } from "../actions/GitLFSAction";

export default function FilesView(context: RepositoryContext & NavigationContext) {
  const [searchText, setSearchText] = useState("");
  const { recentFiles, searchResult, isLoading, clearHistory, addRecent, filePaths } = useTrackedFilesSearch(
    context.gitManager,
    searchText,
  );

  const handleClearRecent = async () => {
    clearHistory();
    await showToast({ style: Toast.Style.Success, title: "Recent files cleared" });
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle={context.gitManager.repoName}
      searchBarPlaceholder="Search files by name, path..."
      searchBarAccessory={WorkspaceNavigationDropdown(context)}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      actions={
        <ActionPanel>
          <SharedActionsSection onClearRecent={handleClearRecent} isSearching={true} {...context} />
        </ActionPanel>
      }
    >
      {filePaths.length === 0 ? (
        <List.EmptyView title="No tracked files" description="Repository has no tracked files." icon={Icon.Document} />
      ) : (
        <>
          {searchText.trim().length === 0 ? (
            recentFiles && recentFiles.length > 0 ? (
              <List.Section title="Recently Visited Files">
                {recentFiles
                  .filter((path: string) => filePaths.includes(path))
                  .map((filePath: string) => (
                    <FileListItem
                      key={`recent:${filePath}`}
                      filePath={filePath}
                      isSearching={false}
                      onOpen={() => addRecent(filePath)}
                      onClearRecent={handleClearRecent}
                      {...context}
                    />
                  ))}
              </List.Section>
            ) : (
              <List.EmptyView
                title="Start typing to search files"
                description="Type to search tracked files using fuzzy match"
                icon={Icon.MagnifyingGlass}
              />
            )
          ) : searchResult.length === 0 ? (
            <List.EmptyView title="No results" description="Try different search terms." icon={Icon.MagnifyingGlass} />
          ) : (
            searchResult.map((filePath: string) => (
              <FileListItem
                key={filePath}
                filePath={filePath}
                onOpen={() => addRecent(filePath)}
                onClearRecent={handleClearRecent}
                isSearching={true}
                {...context}
              />
            ))
          )}
        </>
      )}
    </List>
  );
}

function FileListItem(
  context: RepositoryContext &
    NavigationContext & {
      filePath: string;
      isSearching: boolean;
      onOpen?: () => void;
      onClearRecent: () => void;
    },
) {
  const absolutePath = join(context.gitManager.repoPath, context.filePath);

  return (
    <List.Item
      id={context.filePath}
      title={basename(context.filePath)}
      subtitle={{
        value: context.filePath,
        tooltip: context.filePath,
      }}
      icon={existsSync(absolutePath) ? { fileIcon: absolutePath } : undefined}
      quickLook={existsSync(absolutePath) ? { path: absolutePath, name: absolutePath } : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={basename(context.filePath)}>
            <FileHistoryAction {...context} filePath={absolutePath} onOpen={context.onOpen} />

            <FileManagerActions filePath={absolutePath} />
            <CopyToClipboardMenuAction
              contents={[
                { title: "Relative Path", content: context.filePath, icon: Icon.Document },
                { title: "Absolute Path", content: absolutePath, icon: Icon.Document },
              ]}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <FileAttachedLinksAction {...context} filePath={context.filePath} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Tracking">
            <GitIgnoreAction {...context} />
            <GitLFSAction {...context} />
          </ActionPanel.Section>

          <SharedActionsSection {...context} />
        </ActionPanel>
      }
    />
  );
}

function SharedActionsSection(
  context: RepositoryContext &
    NavigationContext & {
      isSearching: boolean;
      onClearRecent: () => void;
    },
) {
  return (
    <>
      <ActionPanel.Section title="Recent">
        {!context.isSearching && (
          <Action
            title="Clear Recent Files"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd", "ctrl"], key: "x" }}
            onAction={context.onClearRecent}
          />
        )}
      </ActionPanel.Section>
      <WorkspaceNavigationActions {...context} />
    </>
  );
}
