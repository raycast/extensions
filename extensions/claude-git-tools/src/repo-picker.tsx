import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import {
  getDirHistory,
  addDirHistory,
  removeDirHistory,
  addFolder,
} from "./storage";
import { getAllGitRepos, pickFolderDialog } from "./git-utils";

interface RepoPickerProps {
  primaryActionTitle: string;
  onSelect: (fullPath: string) => void;
}

export function RepoPicker({ primaryActionTitle, onSelect }: RepoPickerProps) {
  const [searchText, setSearchText] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [repos, setRepos] = useState<
    { fullPath: string; displayName: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [h, r] = await Promise.all([getDirHistory(), getAllGitRepos()]);
    setHistory(h);
    setRepos(r);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasSearch = searchText.length > 0;
  const filteredRepos = hasSearch
    ? repos.filter(
        (r) =>
          r.displayName.toLowerCase().includes(searchText.toLowerCase()) ||
          r.fullPath.toLowerCase().includes(searchText.toLowerCase()),
      )
    : repos;
  const filteredHistory = hasSearch ? [] : history;

  async function handleSelect(fullPath: string) {
    await addDirHistory(fullPath);
    onSelect(fullPath);
  }

  async function handleAddFolder() {
    const selected = await pickFolderDialog();
    if (selected) {
      await addFolder(selected);
      await refresh();
      await showToast({
        style: Toast.Style.Success,
        title: "Folder added",
        message: selected,
      });
    }
  }

  const noRepos = !isLoading && repos.length === 0 && history.length === 0;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search repositories..."
    >
      {noRepos ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No Folders Configured"
          description="Press Enter to add a folder to scan for git repositories"
          actions={
            <ActionPanel>
              <Action
                title="Add Folder"
                icon={Icon.Plus}
                onAction={handleAddFolder}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {filteredHistory.length > 0 && (
            <List.Section title="Recent">
              {filteredHistory.map((dir) => {
                const display =
                  repos.find((r) => r.fullPath === dir)?.displayName || dir;
                return (
                  <List.Item
                    key={`recent-${dir}`}
                    icon={Icon.Clock}
                    title={display}
                    subtitle={`(${dir})`}
                    actions={
                      <ActionPanel>
                        <Action
                          title={primaryActionTitle}
                          onAction={() => handleSelect(dir)}
                        />
                        <Action
                          title="Remove from History"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          shortcut={{ modifiers: ["cmd"], key: "d" }}
                          onAction={async () => {
                            await removeDirHistory(dir);
                            await refresh();
                          }}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          )}
          <List.Section title={hasSearch ? "Results" : "All Repositories"}>
            {filteredRepos.map((repo) => (
              <List.Item
                key={repo.fullPath}
                icon={Icon.Folder}
                title={repo.displayName}
                subtitle={`(${repo.fullPath})`}
                actions={
                  <ActionPanel>
                    <Action
                      title={primaryActionTitle}
                      onAction={() => handleSelect(repo.fullPath)}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
