import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import React from "react";
import { basename } from "node:path";
import {
  Worktree,
  enrichDirty,
  listWorktrees,
  removeWorktree,
} from "../worktrees";
import { AgentPicker, openApplication, openPath } from "../vibe";
import { NewWorktreeForm } from "./NewWorktreeForm";
import { WorktreeBranchPicker } from "./WorktreeBranchPicker";

export function WorktreeList({
  repoRoot,
  onRefresh,
}: {
  repoRoot: string;
  onRefresh?: () => void;
}) {
  const [worktrees, setWorktrees] = React.useState<Worktree[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const base = await listWorktrees(repoRoot);
      setWorktrees(base);
      const enriched = await enrichDirty(base);
      setWorktrees(enriched);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not list worktrees",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }, [repoRoot]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const remove = async (wt: Worktree) => {
    if (wt.dirty) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Worktree has uncommitted changes",
        message: "Commit or discard them in the worktree first.",
      });
      return;
    }
    const confirmed = await confirmAlert({
      title: "Remove worktree?",
      message: `${wt.path}\n\nThe branch '${wt.branch ?? "detached"}' will be preserved.`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    try {
      await removeWorktree(repoRoot, wt.path);
      await showToast({
        style: Toast.Style.Success,
        title: "Worktree removed",
      });
      await refresh();
      onRefresh?.();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not remove worktree",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <List
      navigationTitle="Worktrees"
      searchBarPlaceholder="Search worktrees…"
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.Push
            title="New Worktree from Current Branch"
            icon={Icon.Plus}
            target={
              <NewWorktreeForm
                repoRoot={repoRoot}
                onCreated={() => void refresh()}
              />
            }
          />
          <Action.Push
            title="Check out Branch as Worktree"
            icon={Icon.Switch}
            target={
              <WorktreeBranchPicker
                repoRoot={repoRoot}
                onCreated={() => void refresh()}
              />
            }
          />
        </ActionPanel>
      }
    >
      {worktrees.map((wt) => {
        const title = basename(wt.path);
        const subtitle = wt.isMain ? "main working tree" : wt.path;
        const accessories: { text: string; icon?: Icon }[] = [];
        if (wt.detached) accessories.push({ text: "detached" });
        else if (wt.branch) accessories.push({ text: wt.branch });
        if (wt.sha) accessories.push({ text: wt.sha });
        if (wt.dirty)
          accessories.push({ text: "dirty", icon: Icon.ExclamationMark });
        return (
          <List.Item
            key={wt.path}
            icon={wt.isMain ? Icon.House : Icon.Folder}
            title={title}
            subtitle={subtitle}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Choose Agent"
                  icon={Icon.Stars}
                  target={
                    <AgentPicker
                      folder={{
                        name: basename(wt.path),
                        path: wt.path,
                      }}
                      onRefresh={onRefresh}
                    />
                  }
                />
                <Action
                  title="Open in Visual Studio Code"
                  icon={Icon.Code}
                  onAction={() =>
                    void openApplication("Visual Studio Code", wt.path)
                  }
                />
                <Action
                  title="Open in Cursor"
                  icon={Icon.Code}
                  onAction={() => void openApplication("Cursor", wt.path)}
                />
                <Action
                  title={
                    process.platform === "win32"
                      ? "Open in File Explorer"
                      : "Open in Finder"
                  }
                  icon={Icon.Finder}
                  onAction={() => void openPath(wt.path)}
                />
                <Action.CopyToClipboard title="Copy Path" content={wt.path} />
                <Action.Push
                  title="New Worktree from Current Branch"
                  icon={Icon.Plus}
                  target={
                    <NewWorktreeForm
                      repoRoot={repoRoot}
                      onCreated={() => void refresh()}
                    />
                  }
                />
                <Action.Push
                  title="Check out Branch as Worktree"
                  icon={Icon.Switch}
                  target={
                    <WorktreeBranchPicker
                      repoRoot={repoRoot}
                      onCreated={() => void refresh()}
                    />
                  }
                />
                {!wt.isMain ? (
                  <Action
                    title="Remove Worktree"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => void remove(wt)}
                  />
                ) : null}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
