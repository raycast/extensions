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
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Worktree, formatPath, getRootDir, getWorktrees, removeWorktree } from "./helpers";

export default function Command() {
  const rootDir = getRootDir();
  const {
    data: worktrees,
    isLoading,
    revalidate,
  } = useCachedPromise((searchDir) => getWorktrees(searchDir), [rootDir]);

  async function handleRemove(repo: string, worktree: Worktree) {
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
      await removeWorktree(repo, worktree.path);
      revalidate();
      await showToast({ title: "Removed worktree", message: formatPath(worktree.path) });
    } catch (err) {
      await showToast({
        title: "Could not remove worktree!",
        message: err instanceof Error ? err.message : undefined,
        style: Toast.Style.Failure,
      });
    }
  }

  const { editorApp, terminalApp } = getPreferenceValues<ExtensionPreferences>();

  return (
    <List isLoading={isLoading}>
      {Object.entries(worktrees ?? {}).map(([repo, worktrees]) => (
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
                  <Action.Open
                    title={`Open in ${editorApp.name}`}
                    icon={{ fileIcon: editorApp.path }}
                    target={worktree.path}
                    application={editorApp.bundleId}
                  />
                  <Action.Open
                    title={`Open in ${terminalApp.name}`}
                    icon={{ fileIcon: terminalApp.path }}
                    target={worktree.path}
                    application={terminalApp.bundleId}
                  />
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
      ))}
    </List>
  );
}
