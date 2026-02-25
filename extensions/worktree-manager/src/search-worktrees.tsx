import React from "react";
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import * as path from "path";
import { getAllWorktrees, removeWorktree, type WorktreeItem } from "./lib/git";
import { expandRoots } from "./lib/preferences";

async function fetchWorktrees(): Promise<WorktreeItem[]> {
  const prefs = getPreferenceValues<Preferences>();
  const roots = expandRoots(prefs.roots ?? "");
  if (roots.length === 0) return [];
  return getAllWorktrees(roots);
}

function matchSearch(wt: WorktreeItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const words = q.split(/\s+/).filter(Boolean);
  // Search by repo, branch, path, and "repo · branch" (display) or "repo branch" (typed)
  const searchable = [
    wt.repoName,
    wt.branch,
    wt.path,
    path.basename(wt.path),
    path.dirname(wt.path),
    `${wt.repoName} ${wt.branch}`,
    `${wt.repoName} · ${wt.branch}`.replace(/·/g, " ").replace(/\s+/g, " ").trim(),
  ]
    .join(" ")
    .toLowerCase();
  return words.every((word) => searchable.includes(word));
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { data: worktrees = [], isLoading, error, revalidate } = useCachedPromise(fetchWorktrees);
  const [searchText, setSearchText] = React.useState("");

  const roots = expandRoots(preferences.roots);
  const hasRoots = roots.length > 0;
  const filtered = React.useMemo(
    () => (searchText.trim() ? worktrees.filter((wt) => matchSearch(wt, searchText)) : worktrees),
    [worktrees, searchText]
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search worktrees by path, branch, repo…"
      filtering={false}
      onSearchTextChange={setSearchText}
    >
      {!hasRoots && (
        <List.EmptyView title="No root paths configured" description="Set Root path in Extension Preferences (⌘,)." />
      )}
      {hasRoots && error && (
        <List.EmptyView
          title="Failed to load worktrees"
          description={error.message}
          icon={Icon.Warning}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      )}
      {hasRoots && !error && worktrees.length === 0 && !isLoading && (
        <List.EmptyView
          title="No worktrees found"
          description="Add Git repo root paths in preferences. Each path can contain multiple repos."
        />
      )}
      {hasRoots && !error && worktrees.length > 0 && filtered.length === 0 && searchText.trim() && (
        <List.EmptyView title="No results" description={`No worktrees match "${searchText.trim()}"`} />
      )}
      {hasRoots &&
        !error &&
        filtered.map((wt) => (
          <List.Item
            key={wt.path}
            title={path.basename(wt.path)}
            subtitle={`${wt.repoName} · ${wt.branch}${wt.isMain ? " · main" : ""}`}
            accessories={[{ text: path.dirname(wt.path) }]}
            actions={
              <ActionPanel>
                <Action.Open
                  title="Open in Editor"
                  target={wt.path}
                  application={preferences.openWith}
                  icon={Icon.Code}
                />
                <Action.ShowInFinder path={wt.path} />
                <Action.CopyToClipboard title="Copy Path" content={wt.path} />
                {!wt.isMain && (
                  <Action
                    title="Remove Worktree"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      if (
                        !(await confirmAlert({
                          title: "Remove worktree?",
                          message: `This will remove the worktree and delete the folder:\n${wt.path}`,
                          primaryAction: {
                            title: "Remove",
                            style: Alert.ActionStyle.Destructive,
                          },
                        }))
                      ) {
                        return;
                      }
                      const toast = await showToast({
                        style: Toast.Style.Animated,
                        title: "Removing worktree…",
                      });
                      const result = await removeWorktree(wt.repoRoot, wt.path);
                      if (result.success) {
                        toast.style = Toast.Style.Success;
                        toast.title = "Worktree removed";
                        revalidate();
                      } else {
                        toast.style = Toast.Style.Failure;
                        toast.title = "Failed to remove";
                        toast.message = result.error;
                      }
                    }}
                  />
                )}
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
