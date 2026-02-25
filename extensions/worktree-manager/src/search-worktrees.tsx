import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import * as path from "path";
import { getAllWorktrees, type WorktreeItem } from "./lib/git";
import { expandRoots, type Preferences } from "./lib/preferences";

async function fetchWorktrees(): Promise<WorktreeItem[]> {
  const prefs = getPreferenceValues<Preferences>();
  const roots = expandRoots(prefs.roots ?? "");
  if (roots.length === 0) return [];
  return getAllWorktrees(roots);
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { data: worktrees, isLoading, error, revalidate } = useCachedPromise(fetchWorktrees);

  const roots = expandRoots(preferences.roots);
  const hasRoots = roots.length > 0;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search worktrees by path, branch, repo…"
      filtering
    >
      {!hasRoots && (
        <List.EmptyView
          title="No root paths configured"
          description="Set Root path in Extension Preferences (⌘,)."
        />
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
      {hasRoots && !error && worktrees?.length === 0 && !isLoading && (
        <List.EmptyView
          title="No worktrees found"
          description="Add Git repo root paths in preferences. Each path can contain multiple repos."
        />
      )}
      {hasRoots &&
        !error &&
        worktrees?.map((wt) => (
          <List.Item
            key={wt.path}
            title={path.basename(wt.path)}
            subtitle={`${wt.repoName} · ${wt.branch}${wt.isMain ? " · main" : ""}`}
            accessories={[{ text: path.dirname(wt.path) }]}
            keywords={[wt.path, wt.branch, wt.repoName]}
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
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
