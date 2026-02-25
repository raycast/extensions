import {
  Action,
  ActionPanel,
  Alert,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import * as path from "path";
import { getAllWorktrees, removeWorktree, type WorktreeItem } from "./lib/git";
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
                {!wt.isMain && (
                  <Action
                    title="Remove Worktree"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() =>
                      Alert.alert({
                        title: "Remove worktree?",
                        message: `This will remove the worktree and delete the folder:\n${wt.path}`,
                        primaryAction: {
                          title: "Remove",
                          style: Alert.ActionStyle.Destructive,
                          onAction: async () => {
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
                          },
                        },
                      })
                    }
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
