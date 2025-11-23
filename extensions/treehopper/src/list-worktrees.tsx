import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import type { Worktree } from "./types";
import { getPreferences, getRepos } from "./utils/config";
import { getWorktrees } from "./utils/git";
import { openInEditor, openInTerminal } from "./utils/open";

export default function ListWorktrees() {
  const [worktrees, setWorktrees] = useState<Worktree[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const repos = getRepos();
        if (repos.length === 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Not configured",
            message: "Configure repos or enable auto-discover in preferences",
          });
          setIsLoading(false);
          return;
        }

        const wts = getWorktrees(repos);
        setWorktrees(wts);
      } catch (e) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error loading worktrees",
          message: String(e),
        });
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const prefs = getPreferences();

  if (!isLoading && worktrees.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Tree}
          title="No worktrees found"
          description="Use 'Create Worktree' to create one"
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search worktrees...">
      {worktrees.map((wt) => {
        const displayName = wt.isRoot ? `${wt.repoName} [root]` : wt.repoName;
        return (
          <List.Item
            key={wt.path}
            icon={Icon.Tree}
            title={`${displayName} / ${wt.branch}`}
            subtitle={wt.path}
            actions={
              <ActionPanel>
                <Action
                  title={`Open in ${prefs.editor}`}
                  icon={Icon.Code}
                  onAction={() => {
                    openInEditor(wt.path);
                    showToast({
                      style: Toast.Style.Success,
                      title: `Opened in ${prefs.editor}`,
                    });
                  }}
                />
                <Action
                  title={`Open in ${prefs.terminal}`}
                  icon={Icon.Terminal}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                  onAction={() => {
                    openInTerminal(wt.path);
                    showToast({
                      style: Toast.Style.Success,
                      title: `Opened in ${prefs.terminal}`,
                    });
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy Path"
                  content={wt.path}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.ShowInFinder
                  path={wt.path}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
