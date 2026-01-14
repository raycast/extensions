import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { FileManagerActions } from "../actions/FileActions";
import { FileHistoryAction } from "./FileHistoryView";
import { basename, join } from "path";
import { useMemo, useState } from "react";
import { existsSync } from "fs";
import { search, sortKind } from "fast-fuzzy";
import { NavigationContext, RepositoryContext } from "../../open-repository";
import { WorkspaceNavigationActions, WorkspaceNavigationDropdown } from "../actions/WorkspaceNavigationActions";
import { FileAttachedLinksAction } from "../actions/StatusActions";
import { CopyToClipboardMenuAction } from "../actions/CopyToClipboardMenuAction";

const MAX_RESULTS = 60;

export default function FilesView(context: RepositoryContext & NavigationContext) {
  const [searchText, setSearchText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [recentFiles, setRecentFiles] = useCachedState<string[]>(`recent-files-${context.gitManager.repoPath}`, []);

  const { data: filePaths = [], isLoading: isLoadingRepositoryContent } = usePromise(
    async (_repoPath: string) => await context.gitManager.getTrackedFilePaths(),
    [context.gitManager.repoPath],
  );
  const searchResult = useMemo(() => {
    const query = searchText.trim();
    if (!query) return [] as string[];

    // Fuzzy search using fast-fuzzy
    setIsSearching(true);
    const results = search(query, filePaths, {
      keySelector: (filePath) => basename(filePath),
      sortBy: sortKind.bestMatch,
      useDamerau: true,
      ignoreCase: true,
    });
    setIsSearching(false);
    return results.slice(0, MAX_RESULTS);
  }, [filePaths, searchText]);

  const handleAddRecent = (filePath: string) => {
    setRecentFiles((prev) => {
      const next = [filePath, ...prev.filter((p) => p !== filePath)];
      return next;
    });
  };

  const handleClearRecent = async () => {
    setRecentFiles([]);
    await showToast({ style: Toast.Style.Success, title: "Recent files cleared" });
  };

  return (
    <List
      isLoading={isLoadingRepositoryContent || isSearching}
      navigationTitle={context.gitManager.repoName}
      searchBarPlaceholder="Search files by name, path..."
      searchBarAccessory={WorkspaceNavigationDropdown(context)}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      actions={
        <ActionPanel>
          <SharedActionsSection onClearRecent={handleClearRecent} files={recentFiles} {...context} />
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
                      onOpen={() => handleAddRecent(filePath)}
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
                onOpen={() => handleAddRecent(filePath)}
                onClearRecent={handleClearRecent}
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
          <SharedActionsSection {...context} />
        </ActionPanel>
      }
    />
  );
}

function SharedActionsSection(
  context: RepositoryContext &
    NavigationContext & {
      files?: string[];
      onClearRecent: () => void;
    },
) {
  return (
    <>
      <ActionPanel.Section title="Recent">
        {context.files && context.files.length > 0 && (
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
