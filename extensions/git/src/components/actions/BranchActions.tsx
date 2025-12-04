import {
  ActionPanel,
  Action,
  Icon,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  Form,
  useNavigation,
  clearSearchBar,
  Color,
} from "@raycast/api";
import { useMemo, useState } from "react";
import { Branch, MergeMode, Remote } from "../../types";
import InteractiveRebaseEditorView from "../views/InteractiveRebaseEditorView";
import { RemoteHostIcon } from "../icons/RemoteHostIcons";
import { NavigationContext, RepositoryContext } from "../../open-repository";
import { RemoteWebPageAction } from "./RemoteActions";

/**
 * Unified action for checking out a branch (local or remote).
 */
export function BranchCkeckoutAction(context: RepositoryContext & NavigationContext & { branch: Branch }) {
  const handleCheckout = async () => {
    const isRemote = context.branch.type === "remote";

    const confirmed = await confirmAlert({
      title: "Checkout branch",
      message: `Are you sure you want to checkout ${isRemote ? "remote " : ""}branch "${context.branch.name}"?`,
      primaryAction: {
        title: "Checkout",
        style: Alert.ActionStyle.Default,
      },
    });

    if (confirmed) {
      try {
        if (isRemote) {
          await context.gitManager.checkoutRemoteBranch(context.branch.name, context.branch.upstream!.fullName);
        } else {
          await context.gitManager.checkoutLocalBranch(context.branch.name);
        }
        clearSearchBar();
        context.branches.revalidate();
        context.status.revalidate();
        context.commits.revalidate();
      } catch {
        context.branches.revalidate();
        context.status.revalidate();
        context.commits.revalidate();
        context.navigateTo("status");
      }
    }
  };

  return <Action title="Checkout" onAction={handleCheckout} icon={`arrow-checkout.svg`} />;
}

/**
 * Action for showing commits for a branch.
 */
export function BranchShowCommitsAction(context: RepositoryContext & NavigationContext & { branch: Branch }) {
  return (
    <Action
      title="Show Commits"
      onAction={() => {
        if (context.branch.type === "current") {
          context.commits.setFilter({ kind: "current", upstream: false });
        } else {
          context.commits.setFilter({ kind: "branch", value: context.branch });
        }
        context.navigateTo("commits");
      }}
      icon={Icon.List}
    />
  );
}

/**
 * Action for deleting a branch.
 */
export function BranchDeleteAction(context: RepositoryContext & { branch: Branch }) {
  const handleDeleteBranch = async () => {
    const confirmed = await confirmAlert({
      title: "Delete branch?",
      message: `Are you sure you want to delete branch "${context.branch.name}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        if (context.branch.type === "local") {
          if (context.branch.upstream && !context.branch.isGone) {
            const confirmed = await confirmAlert({
              title: "Delete remote branch",
              message: `Also delete remote branch "${context.branch.upstream.fullName}"?`,
              primaryAction: {
                title: "Delete",
                style: Alert.ActionStyle.Destructive,
              },
              dismissAction: {
                title: "Skip",
              },
            });
            if (confirmed) {
              const summaryConfirm = await confirmAlert({
                title: "Final confirmation of deletion",
                message: `This action will delete local and remote branch. This action cannot be undone.`,
                primaryAction: {
                  title: "Delete Both",
                  style: Alert.ActionStyle.Destructive,
                },
              });
              if (summaryConfirm) {
                await context.gitManager.deleteRemoteBranch(
                  context.branch.upstream!.remote,
                  context.branch.upstream!.name,
                );
              }
            }
          }
          await context.gitManager.deleteBranch(context.branch.name);
        } else if (context.branch.remote) {
          await context.gitManager.deleteRemoteBranch(context.branch.remote, context.branch.name);
        }

        context.branches.revalidate();
        context.status.revalidate();
      } catch {
        // Git error is already shown by GitManager
      }
    }
  };

  return (
    <Action
      title="Delete Branch"
      onAction={handleDeleteBranch}
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
    />
  );
}

/**
 * Action for pushing the current branch.
 */
export function BranchPushAction(context: RepositoryContext & { branch: Branch }) {
  const handlePushToRemote = async (remote: string) => {
    try {
      await context.gitManager.pushBranch(context.branch, remote);
      context.branches.revalidate();
      context.status.revalidate();
    } catch {
      // Git error is already shown by GitManager
    }
  };

  if (Object.keys(context.remotes.data).length === 0) {
    return undefined;
  }

  if (Object.keys(context.remotes.data).length === 1) {
    return (
      <Action
        title="Push"
        onAction={() => handlePushToRemote(Object.keys(context.remotes.data)[0])}
        icon={`git-push.svg`}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
      />
    );
  }

  return (
    <ActionPanel.Submenu title="Push to" icon={`git-push.svg`} shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}>
      {Object.keys(context.remotes.data).map((remote) => (
        <Action
          key={`${remote}:push`}
          title={remote}
          icon={RemoteHostIcon(context.remotes.data[remote])}
          onAction={() => handlePushToRemote(remote)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

export function BranchPushForceAction(context: RepositoryContext & { branch: Branch }) {
  const handleForcePushToRemote = async (remote: string) => {
    const confirmed = await confirmAlert({
      title: "Push Force",
      message: `Are you sure you want to force push the current branch to '${remote}'?`,
      primaryAction: {
        title: "Force",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;
    try {
      await context.gitManager.pushBranch(context.branch, remote, true);
      context.branches.revalidate();
      context.status.revalidate();
    } catch {
      // Git error is already shown by GitManager
    }
  };

  if (Object.keys(context.remotes.data).length === 0) {
    return undefined;
  }

  if (Object.keys(context.remotes.data).length === 1) {
    return (
      <Action
        title="Force Push"
        onAction={() => handleForcePushToRemote(Object.keys(context.remotes.data)[0])}
        icon={{ source: `git-push.svg`, tintColor: Color.Red }}
        shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "p" }}
        style={Action.Style.Destructive}
      />
    );
  }

  return (
    <ActionPanel.Submenu
      title="Force Push to"
      icon={{ source: `git-push.svg`, tintColor: Color.Red }}
      shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "p" }}
    >
      {Object.keys(context.remotes.data).map((remote) => (
        <Action
          key={`${remote}:force-push`}
          title={remote}
          icon={RemoteHostIcon(context.remotes.data[remote])}
          onAction={() => handleForcePushToRemote(remote)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

/**
 * Action for merging a branch into the current branch.
 */
export function BranchMergeAction(context: RepositoryContext & NavigationContext & { branch: Branch }) {
  const handleMergeBranch = async (mode: MergeMode) => {
    const confirmed = await confirmAlert({
      title: "Merge branch",
      message: `Are you sure you want to merge branch "${context.branch.name}" into the current branch?`,
      primaryAction: {
        title: "Merge",
        style: Alert.ActionStyle.Default,
      },
    });

    if (confirmed) {
      try {
        await context.gitManager.mergeBranch(context.branch.name, mode);
        context.branches.revalidate();
        context.status.revalidate();
      } catch {
        context.branches.revalidate();
        context.status.revalidate();
        context.navigateTo("status");
      }
    }
  };

  return (
    <ActionPanel.Submenu title="Merge into Current" icon={`git-merge.svg`} shortcut={{ modifiers: ["cmd"], key: "m" }}>
      <Action title="Fast Forward (If Possible)" onAction={() => handleMergeBranch(MergeMode.FAST_FORWARD)} />
      <Action title="No Fast Forward" onAction={() => handleMergeBranch(MergeMode.NO_FF)} />
      <Action title="Squash" onAction={() => handleMergeBranch(MergeMode.SQUASH)} />
      <Action title="No Commit" onAction={() => handleMergeBranch(MergeMode.NO_COMMIT)} />
    </ActionPanel.Submenu>
  );
}

/**
 * Action for rebasing the current branch onto another branch.
 */
export function BranchRebaseAction(context: RepositoryContext & NavigationContext & { branch: Branch }) {
  const handleRebaseBranch = async () => {
    const confirmed = await confirmAlert({
      title: "Rebase branch",
      message: `Are you sure you want to rebase the current branch onto "${context.branch.name}"?`,
      primaryAction: {
        title: "Rebase",
        style: Alert.ActionStyle.Default,
      },
    });

    if (confirmed) {
      try {
        await context.gitManager.rebase(context.branch.name);
        context.branches.revalidate();
        context.commits.revalidate();
        context.status.revalidate();
      } catch {
        context.branches.revalidate();
        context.status.revalidate();
        context.navigateTo("status");
      }
    }
  };

  return (
    <Action
      title="Rebase to Here"
      onAction={handleRebaseBranch}
      icon={`arrow-rebase.svg`}
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
    />
  );
}

/**
 * Action to open Interactive Rebase Editor starting from selected branch.
 */
export function BranchInteractiveRebaseAction(context: RepositoryContext & NavigationContext & { branch: Branch }) {
  return (
    <Action.Push
      title="Interactive Rebase from Here"
      icon={{ source: `arrow-rebase.svg`, tintColor: Color.Blue }}
      target={<InteractiveRebaseEditorView {...context} startFromCommit={context.branch.name} />}
      shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "e" }}
    />
  );
}

/**
 * Additional actions for creating a new branch.
 */
export function BranchCreateAction(context: RepositoryContext) {
  return (
    <Action.Push
      title="Create New Branch"
      target={<BranchCreateForm {...context} />}
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
    />
  );
}

/**
 * Action for renaming a branch.
 */
export function BranchRenameAction(context: RepositoryContext & NavigationContext & { branch: Branch }) {
  return (
    <Action.Push
      title="Rename"
      target={<BranchRenameForm {...context} />}
      icon={{ source: Icon.Pencil, tintColor: Color.Yellow }}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
    />
  );
}

function BranchCreateForm(context: RepositoryContext) {
  const { pop } = useNavigation();
  const [branchName, setBranchName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: { branchName: string }) => {
    setIsLoading(true);
    try {
      await context.gitManager.createBranch(values.branchName);
      context.branches.revalidate();
      context.status.revalidate();
      pop();
    } catch {
      // Git error is already shown by GitManager
    }
    setIsLoading(false);
  };

  return (
    <Form
      navigationTitle="Create Branch"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Branch" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="branchName"
        title="Branch Name"
        placeholder="Enter branch name"
        error={branchName.trim().length === 0 ? "Required" : undefined}
        value={branchName}
        onChange={(value) => setBranchName(value.replace(/ /g, "-"))}
      />
      {context.branches.data.currentBranch && (
        <Form.Description text={`From branch '${context.branches.data.currentBranch.displayName}'`} />
      )}
    </Form>
  );
}

function BranchRenameForm(context: RepositoryContext & { branch: Branch }) {
  const { pop } = useNavigation();
  const [newBranchName, setNewBranchName] = useState(context.branch.name);
  const [renameRemote, setRenameRemote] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: { newBranchName: string; renameRemote?: boolean }) => {
    setIsLoading(true);

    try {
      await context.gitManager.renameBranch(
        values.newBranchName,
        context.branch.name,
        renameRemote ? context.branch.upstream : undefined,
      );

      await showToast({
        style: Toast.Style.Success,
        title: "Branch renamed successfully",
      });

      context.branches.revalidate();
      context.status.revalidate();
      pop();
    } catch {
      // Git error is already shown by GitManager
    }
    setIsLoading(false);
  };

  return (
    <Form
      navigationTitle="Rename Branch"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename Branch" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="newBranchName"
        title="Branch Name"
        placeholder="New branch name"
        error={newBranchName.trim().length === 0 ? "Required" : undefined}
        value={newBranchName}
        onChange={(value) => setNewBranchName(value.replace(/ /g, "-"))}
      />

      {context.branch.upstream && (
        <Form.Checkbox
          id="renameRemote"
          label={`Rename remote branch '${context.branch.upstream.fullName}'`}
          value={renameRemote}
          onChange={setRenameRemote}
          info="This will delete the old remote branch and push the new one"
        />
      )}
    </Form>
  );
}

/**
 * Action for opening the attached links of a branch.
 */
export function BranchAttachedLinksAction(context: RepositoryContext & { branch: Branch }) {
  const branchContext: { remote: Remote; branch: string } | undefined = useMemo(() => {
    if (context.branch.upstream) {
      if (context.branch.isGone) return undefined;

      return {
        remote: context.remotes.data[context.branch.upstream.remote],
        branch: context.branch.upstream.name,
      };
    }

    if (context.branch.remote) {
      return {
        remote: context.remotes.data[context.branch.remote],
        branch: context.branch.name,
      };
    }

    return undefined;
  }, [context.branch]);

  if (!branchContext) {
    return undefined;
  }

  return (
    <ActionPanel.Submenu title="Open Link to" icon={Icon.Link} shortcut={{ modifiers: ["cmd"], key: "l" }}>
      <RemoteWebPageAction.Branch remote={branchContext.remote} branch={branchContext.branch} />
      <RemoteWebPageAction.Base remote={branchContext.remote} />
    </ActionPanel.Submenu>
  );
}
