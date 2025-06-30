import { relative } from "node:path";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import AddCommand from "./add";
import { Worktree, formatPath, getRootDir, getWorktrees, removeWorktree } from "./helpers";
import { useRef } from "react";

export default function Command() {
  const rootDir = getRootDir();
  const {
    data: worktrees,
    isLoading,
    revalidate,
  } = useCachedPromise((searchDir) => getWorktrees(searchDir), [rootDir]);
  const removing = useRef(false);

  async function handleRemove(repo: string, worktree: Worktree) {
    if (removing.current) {
      return;
    }

    if (
      !(await confirmAlert({
        title: "Are you sure you want to remove the worktree?",
        primaryAction: {
          title: "Remove",
          style: Alert.ActionStyle.Destructive,
        },
      }))
    ) {
      return;
    }

    try {
      removing.current = true;
      await showToast({ title: "Removing worktree", message: formatPath(worktree.path), style: Toast.Style.Animated });
      await removeWorktree(repo, worktree.path);
      revalidate();
      await showToast({ title: "Removed worktree", message: formatPath(worktree.path) });
    } catch (err) {
      await showToast({
        title: "Could not remove worktree!",
        message: err instanceof Error ? err.message : undefined,
        style: Toast.Style.Failure,
      });
    } finally {
      removing.current = false;
    }
  }

  const { editorApp, terminalApp } = getPreferenceValues<ExtensionPreferences>();

  const worktreeEntries = Object.entries(worktrees ?? {});

  return (
    <List isLoading={isLoading}>
      {worktreeEntries.length === 0 ? (
        <List.EmptyView
          title={`No worktrees found in ${formatPath(rootDir)}`}
          description="Try adding a new worktree or changing your repo dir preference."
          actions={
            <ActionPanel>
              <Action.Push title="Add Worktree" icon={Icon.Plus} target={<AddCommand />} />
              <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        worktreeEntries.map(([repo, worktrees]) => (
          <List.Section title={formatPath(repo)} key={repo}>
            {worktrees.map((worktree) => (
              <List.Item
                key={worktree.branch}
                icon={Icon.Folder}
                title={relative(rootDir, worktree.path)}
                subtitle={`${worktree.branch ?? "detached"} @ ${worktree.commit?.slice(0, 7) ?? "none"}`}
                accessories={worktree.dirty ? [{ text: { value: "Dirty", color: Color.Yellow } }] : undefined}
                actions={
                  <ActionPanel>
                    {editorApp && (
                      <Action.Open
                        title={`Open in ${editorApp.name}`}
                        icon={{ fileIcon: editorApp.path }}
                        target={worktree.path}
                        application={editorApp.bundleId}
                      />
                    )}
                    {terminalApp && (
                      <Action.Open
                        title={`Open in ${terminalApp.name}`}
                        icon={{ fileIcon: terminalApp.path }}
                        target={worktree.path}
                        application={terminalApp.bundleId}
                      />
                    )}
                    {!worktree.dirty && (
                      <Action
                        title="Remove Worktree"
                        icon={Icon.Trash}
                        shortcut={{ key: "x", modifiers: ["ctrl"] }}
                        style={Action.Style.Destructive}
                        onAction={() => handleRemove(repo, worktree)}
                      />
                    )}
                    <Action
                      title="Refresh"
                      shortcut={{ key: "r", modifiers: ["cmd"] }}
                      icon={Icon.ArrowClockwise}
                      onAction={() => revalidate()}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
