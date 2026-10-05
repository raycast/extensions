import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { basename, dirname, join } from "path";
import { Worktree } from "../../types";
import { NavigationContext, RepositoryContext } from "../../open-repository";
import { prettyPath } from "../../utils/path-utils";

/**
 * Action for opening a worktree as a repository.
 */
export function WorktreeOpenAction(context: NavigationContext & { worktree: Worktree }) {
  return <Action title="Open Worktree" icon={Icon.Folder} onAction={() => context.switchTo(context.worktree.path)} />;
}

/**
 * Action for creating a new linked worktree.
 */
export function WorktreeCreateAction(context: RepositoryContext & NavigationContext) {
  return (
    <Action.Push
      title="Create New Worktree"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<WorktreeCreateForm {...context} />}
    />
  );
}

/**
 * Action for creating a quicklink to open a worktree in this extension.
 */
export function WorktreeQuickLinkAction({ worktree }: { worktree: Worktree }) {
  return (
    <Action.CreateQuicklink
      title="Create Quicklink"
      shortcut={{ modifiers: ["cmd"], key: "l" }}
      quicklink={{
        link: `raycast://extensions/ernest0n/git/open-repository?arguments=${encodeURIComponent(JSON.stringify({ path: worktree.path, currentView: "status" }))}`,
        name: `Show ${worktree.name} in Git`,
      }}
    />
  );
}

/**
 * Action for deleting a worktree together with its directory.
 * Not available for the main worktree and for the currently opened one.
 */
export function WorktreeDeleteAction(context: RepositoryContext & { worktree: Worktree }) {
  if (context.worktree.isMain || context.worktrees.isOpened(context.worktree)) {
    return undefined;
  }

  const handleDelete = async () => {
    const confirmed = await confirmAlert({
      title: "Delete worktree?",
      message: `Are you sure you want to delete worktree "${context.worktree.name}"? Directory ${prettyPath(context.worktree.path)} will be removed from disk.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      await context.gitManager.removeWorktree(context.worktree.path);
      context.worktrees.revalidate();
      await showToast({ style: Toast.Style.Success, title: `Worktree '${context.worktree.name}' deleted` });
    } catch {
      // Git error is already shown by GitManager
    }
  };

  return (
    <Action
      title="Delete Worktree"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      onAction={handleDelete}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
    />
  );
}

function WorktreeCreateForm(context: RepositoryContext & NavigationContext) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [worktreeName, setWorktreeName] = useState("");
  const [branchName, setBranchName] = useState("");

  const availableBranches = useMemo(() => {
    const branches = [
      ...(context.branches.data.currentBranch ? [context.branches.data.currentBranch] : []),
      ...context.branches.data.localBranches,
    ];

    const occupiedBranchNames = new Set(
      context.worktrees.data
        .filter((worktree) => !worktree.isPrunable && Boolean(worktree.branch))
        .map((worktree) => worktree.branch as string),
    );

    return branches.filter((branch) => !occupiedBranchNames.has(branch.name));
  }, [context.branches.data.currentBranch, context.branches.data.localBranches, context.worktrees.data]);

  useEffect(() => {
    if (availableBranches.length === 0) {
      setBranchName("");
      return;
    }

    if (!availableBranches.some((branch) => branch.name === branchName)) {
      setBranchName(availableBranches[0].name);
    }
  }, [availableBranches, branchName]);

  const selectedBranchName = availableBranches.some((branch) => branch.name === branchName)
    ? branchName
    : (availableBranches[0]?.name ?? "");

  const handleSubmit = async (values: { worktreeName: string; branchName: string }) => {
    setIsLoading(true);
    const name = values.worktreeName.trim();
    // Sibling of the main worktree so the new directory does not appear as untracked files
    const repositoryRootPath = context.gitManager.repositoryRootPath;
    const path = join(dirname(repositoryRootPath), `${basename(repositoryRootPath)}-${name}`);

    try {
      await context.gitManager.createWorktree(path, values.branchName.trim());
      await showToast({
        style: Toast.Style.Success,
        title: `Worktree '${name}' created`,
      });
      context.worktrees.revalidate();
      context.branches.revalidate();
      pop();
      context.switchTo(path);
    } catch {
      // Git error is already shown by GitManager
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      navigationTitle="Create Worktree"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Worktree" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="worktreeName"
        title="Worktree Name"
        placeholder="feature-worktree"
        value={worktreeName}
        onChange={(value) => setWorktreeName(value.replace(/ /g, "-"))}
        error={worktreeName.trim().length === 0 ? "Required" : undefined}
      />
      <Form.Dropdown
        id="branchName"
        title="Branch"
        value={selectedBranchName}
        onChange={setBranchName}
        error={selectedBranchName.trim().length === 0 ? "No available branch" : undefined}
      >
        {availableBranches.map((branch) => (
          <Form.Dropdown.Item key={branch.name} value={branch.name} title={branch.displayName} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
