import { Action, ActionPanel, Alert, Icon, List, closeMainWindow, confirmAlert } from "@raycast/api";
import { CreateWorktreeForm } from "./components/create-worktree-form";
import { useHerdrSnapshot } from "./hooks/use-herdr-snapshot";
import { focusResource, runHerdr } from "./lib/herdr";
import { revealFocusedHerdr } from "./lib/terminal";
import { ErrorView, runAction, shortcuts } from "./lib/ui";

export default function Command() {
  const snapshot = useHerdrSnapshot();
  if (snapshot.error && !snapshot.data) return <ErrorView error={snapshot.error} onRetry={snapshot.revalidate} />;
  const worktrees = (snapshot.data?.workspaces || []).filter((workspace) => workspace.worktree);

  async function remove(workspaceId: string, label: string, force: boolean) {
    if (
      !(await confirmAlert({
        title: `${force ? "Force remove" : "Remove"} worktree “${label}”?`,
        message: force
          ? "This removes the checkout even if Git reports uncommitted changes. The branch is not deleted."
          : "Herdr closes its workspace and asks Git to remove the checkout. The branch is not deleted.",
        primaryAction: {
          title: force ? "Force Remove Worktree" : "Remove Worktree",
          style: Alert.ActionStyle.Destructive,
        },
      }))
    )
      return;
    await runAction(
      "Removing worktree",
      () =>
        runHerdr(["worktree", "remove", "--workspace", workspaceId, ...(force ? ["--force"] : []), "--json"], {
          timeout: 120_000,
        }).then(() => undefined),
      {
        success: "Worktree Removed",
        onSuccess: snapshot.revalidate,
      },
    );
  }

  return (
    <List isLoading={snapshot.isLoading} searchBarPlaceholder="Search branches and worktree paths…">
      <List.EmptyView
        icon={Icon.Hammer}
        title="No Open Worktrees"
        description="Create a worktree from any Herdr workspace backed by a Git repository."
      />
      {worktrees.map((workspace) => (
        <List.Item
          key={workspace.workspace_id}
          icon={Icon.Hammer}
          title={workspace.label}
          subtitle={workspace.worktree?.checkout_path}
          keywords={[
            workspace.workspace_id,
            workspace.worktree?.repo_name || "",
            workspace.worktree?.repo_root || "",
            workspace.worktree?.checkout_path || "",
          ]}
          accessories={[
            ...(workspace.worktree?.repo_name ? [{ tag: workspace.worktree.repo_name }] : []),
            ...(workspace.focused ? [{ tag: "Focused" }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Focus Worktree"
                icon={Icon.BullsEye}
                onAction={async () => {
                  let shouldCloseRaycast = false;
                  const succeeded = await runAction(
                    "Focusing worktree",
                    async () => {
                      await focusResource("workspace", workspace.workspace_id);
                      shouldCloseRaycast = await revealFocusedHerdr();
                    },
                    { success: "Worktree Focused" },
                  );
                  if (!succeeded) return;
                  if (shouldCloseRaycast) {
                    void snapshot.revalidate();
                    await closeMainWindow({ clearRootSearch: true });
                  } else {
                    await snapshot.revalidate();
                  }
                }}
              />
              <Action.Push
                title="Create Another Worktree"
                icon={Icon.Plus}
                target={<CreateWorktreeForm initialWorkspaceId={workspace.workspace_id} onDone={snapshot.revalidate} />}
              />
              {workspace.worktree?.checkout_path ? (
                <Action.ShowInFinder path={workspace.worktree.checkout_path} shortcut={shortcuts.copyPath} />
              ) : null}
              {workspace.worktree?.repo_root ? (
                <Action.CopyToClipboard
                  title="Copy Repository Root"
                  content={workspace.worktree.repo_root}
                  shortcut={shortcuts.copyId}
                />
              ) : null}
              <Action
                title="Remove Worktree"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={shortcuts.delete}
                onAction={() => remove(workspace.workspace_id, workspace.label, false)}
              />
              <Action
                title="Force Remove Worktree"
                icon={Icon.ExclamationMark}
                style={Action.Style.Destructive}
                onAction={() => remove(workspace.workspace_id, workspace.label, true)}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={shortcuts.refresh}
                onAction={snapshot.revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
      {!snapshot.isLoading && worktrees.length === 0 ? (
        <List.Section title="Get Started">
          <List.Item
            icon={Icon.Plus}
            title="Create Your First Worktree"
            actions={
              <ActionPanel>
                <Action.Push
                  title="Create Worktree"
                  icon={Icon.Plus}
                  target={<CreateWorktreeForm onDone={snapshot.revalidate} />}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
    </List>
  );
}
