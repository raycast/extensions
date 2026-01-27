import {
  ActionPanel,
  Action,
  Icon,
  confirmAlert,
  Alert,
  clearSearchBar,
  useNavigation,
  Clipboard,
  Form,
  Color,
} from "@raycast/api";
import { Commit } from "../../types";
import InteractiveRebaseEditorView from "../views/InteractiveRebaseEditorView";
import { ResetMode } from "simple-git";
import { getFavicon, useCachedState } from "@raycast/utils";
import { existsSync } from "fs";
import { NavigationContext, RepositoryContext } from "../../open-repository";
import { CommitMessageForm } from "../views/CommitMessageView";
import { useMemo } from "react";
import { useIssueTracker } from "../../hooks/useIssueTracker";
import { RemoteWebPageAction } from "./RemoteActions";

/**
 * Action for checking out a commit.
 */
export function CommitCheckoutAction(context: RepositoryContext & NavigationContext & { commit: Commit }) {
  const handleCheckoutCommit = async () => {
    const isBranch = context.commit.localBranches.length > 0;
    const targetName = isBranch ? context.commit.localBranches[0] : context.commit.shortHash;

    const confirmed = await confirmAlert({
      title: "Checkout commit",
      message: `Are you sure you want to checkout commit? This will put you in a ${isBranch ? `'${targetName}' branch` : "detached HEAD"} state.`,
      primaryAction: {
        title: "Checkout",
        style: Alert.ActionStyle.Default,
      },
    });

    if (confirmed) {
      try {
        await context.gitManager.checkoutCommit(targetName);
        await context.commits.setFilter({ kind: "current", upstream: false });
      } catch {
        // Git error is already shown by GitManager
      } finally {
        context.branches.revalidate();
        context.status.revalidate();
        clearSearchBar();
      }
    }
  };

  return <Action title="Checkout Commit" onAction={handleCheckoutCommit} icon={`arrow-checkout.svg`} />;
}

/**
 * Action for rewording a commit message.
 */
export function CommitRewordAction(context: RepositoryContext & NavigationContext & { commit: Commit }) {
  return (
    <Action.Push
      title="Reword Message"
      icon={{ source: Icon.Message, tintColor: Color.Yellow }}
      target={<CommitMessageForm {...context} />}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
    />
  );
}

/**
 * Action for cherry-picking a commit.
 */
export function CommitCherryPickAction(context: RepositoryContext & NavigationContext & { commit: Commit }) {
  const handleCherryPick = async () => {
    const confirmed = await confirmAlert({
      title: "Cherry-pick commit",
      message: `Are you sure you want to cherry-pick commit '${context.commit.shortHash}'? This will create a new commit that undoes the changes.`,
      primaryAction: {
        title: "Cherry-pick",
        style: Alert.ActionStyle.Default,
      },
    });

    if (confirmed) {
      try {
        await context.gitManager.cherryPick(context.commit.hash);
        context.commits.revalidate();
        context.status.revalidate();
      } catch {
        context.commits.revalidate();
        context.status.revalidate();
        context.navigateTo("status");
      }
    }
  };

  return <Action title="Cherry-Pick Commit" onAction={handleCherryPick} icon={`arrow-bounce.svg`} />;
}

/**
 * Action for reverting a commit.
 */
export function CommitRevertAction(context: RepositoryContext & NavigationContext & { commit: Commit }) {
  const handleRevert = async () => {
    const confirmed = await confirmAlert({
      title: "Revert commit",
      message: `Are you sure you want to revert commit '${context.commit.message}'? This will create a new commit that undoes the changes.`,
      primaryAction: {
        title: "Revert",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await context.gitManager.revert(context.commit.hash);
        context.branches.revalidate();
        context.commits.revalidate();
        context.status.revalidate();
      } catch {
        context.branches.revalidate();
        context.commits.revalidate();
        context.status.revalidate();
        context.navigateTo("status");
      } finally {
        clearSearchBar();
      }
    }
  };

  return (
    <Action
      title="Revert Commit"
      onAction={handleRevert}
      style={Action.Style.Destructive}
      icon={Icon.ArrowCounterClockwise}
      shortcut={{ modifiers: ["cmd", "shift"], key: "z" }}
    />
  );
}

/**
 * Action submenu for resetting to a commit.
 */
export function CommitResetAction(context: RepositoryContext & NavigationContext & { commit: Commit }) {
  const handleReset = async (mode: ResetMode) => {
    const confirmed = await confirmAlert({
      title: "Reset to commit",
      message: `Are you sure you want to reset to commit "${context.commit.shortHash}"? This action cannot be undone.`,
      primaryAction: {
        title: "Reset",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await context.gitManager.reset(context.commit.hash, mode);
        context.commits.revalidate();
        context.status.revalidate();
      } catch {
        context.commits.revalidate();
        context.status.revalidate();
        context.navigateTo("status");
      } finally {
        clearSearchBar();
      }
    }
  };

  return (
    <ActionPanel.Submenu title="Reset to Here" icon={Icon.ArrowClockwise}>
      <Action
        title="Soft Reset (Keep Changes Staged)"
        icon={{ source: Icon.Dot, tintColor: Color.Green }}
        onAction={() => handleReset(ResetMode.SOFT)}
        shortcut={{ modifiers: ["cmd"], key: "s" }}
      />
      <Action
        title="Mixed Reset (Keep Changes Unstaged)"
        icon={{ source: Icon.Dot, tintColor: Color.Yellow }}
        onAction={() => handleReset(ResetMode.MIXED)}
        shortcut={{ modifiers: ["cmd"], key: "m" }}
      />
      <Action
        title="Hard Reset (Discard All Changes)"
        icon={{ source: Icon.Dot, tintColor: Color.Red }}
        onAction={() => handleReset(ResetMode.HARD)}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["cmd"], key: "h" }}
      />
    </ActionPanel.Submenu>
  );
}

/**
 * Action for rebasing the current commit onto another commit.
 */
export function CommitRebaseAction(context: RepositoryContext & NavigationContext & { commit: Commit }) {
  const handleRebaseCommit = async () => {
    const targetName =
      context.commit.localBranches.length > 0 ? context.commit.localBranches[0] : context.commit.shortHash;

    const confirmed = await confirmAlert({
      title: "Rebase commit",
      message: `Are you sure you want to rebase the current commit onto "${targetName}"?`,
      primaryAction: {
        title: "Rebase",
        style: Alert.ActionStyle.Default,
      },
    });

    if (confirmed) {
      try {
        await context.gitManager.rebase(targetName);
        context.branches.revalidate();
        context.commits.revalidate();
        context.status.revalidate();
      } catch {
        context.branches.revalidate();
        context.status.revalidate();
        context.navigateTo("status");
      } finally {
        clearSearchBar();
      }
    }
  };

  return (
    <Action
      title="Rebase to Here"
      onAction={handleRebaseCommit}
      icon={`arrow-rebase.svg`}
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
    />
  );
}

/**
 * Action to open Interactive Rebase Editor starting from selected commit.
 */
export function CommitInteractiveRebaseAction(context: RepositoryContext & NavigationContext & { commit: Commit }) {
  return (
    <Action.Push
      title="Interactive Rebase from Here"
      icon={{ source: `arrow-rebase.svg`, tintColor: Color.Blue }}
      target={<InteractiveRebaseEditorView startFromCommit={context.commit.hash} {...context} />}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
    />
  );
}

/**
 * Action to save a commit as a patch.
 */
export function CommitPatchCreateAction(context: RepositoryContext & NavigationContext & { commit: Commit }) {
  return (
    <Action.Push
      title="Save as Patch"
      icon={`patch.svg`}
      shortcut={{ modifiers: ["cmd"], key: "s" }}
      target={PatchCreateForm(context)}
    />
  );
}

function PatchCreateForm(context: RepositoryContext & NavigationContext & { commit: Commit }) {
  const { pop } = useNavigation();
  const [directoryPath, setDirectoryPath] = useCachedState<string[]>(`patches-directory`, []);

  const validateDirectoryPath = (directoryPath: string[]) => {
    if (directoryPath.length === 0) {
      return "Required";
    }

    if (!existsSync(directoryPath[0])) {
      return "Not exists";
    }

    return undefined;
  };

  const handleSubmit = async (values: { directoryPath: string[] }) => {
    try {
      const patchPath = await context.gitManager.createPatchFromCommit(context.commit.hash, values.directoryPath[0]);
      await Clipboard.copy(patchPath);
      pop();
    } catch {
      // Git error is already shown by GitManager
    }
  };

  return (
    <Form
      navigationTitle="Create Patch"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Patch" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="directoryPath"
        title="Output Directory"
        value={directoryPath}
        error={validateDirectoryPath(directoryPath)}
        onChange={setDirectoryPath}
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
    </Form>
  );
}

/**
 * Action for opening the attached links of a commit.
 */
export function CommitAttachedLinksAction(context: RepositoryContext & { commit: Commit }) {
  const { findUrls } = useIssueTracker();

  const commitUrls = useMemo(() => findUrls(context.commit.message), [context.commit.message]);

  const selectedBranch: string | undefined = useMemo(() => {
    if (context.commits.selectedBranch?.kind !== "branch") {
      return undefined;
    }

    if (context.commits.selectedBranch?.remote) {
      return context.commits.selectedBranch.name;
    }

    if (context.commits.selectedBranch?.upstream) {
      return context.commits.selectedBranch.upstream.name;
    }

    return undefined;
  }, [context.commits.selectedBranch]);

  return (
    <ActionPanel.Submenu title="Open Link to" icon={Icon.Link} shortcut={{ modifiers: ["cmd"], key: "l" }}>
      <ActionPanel.Section>
        {commitUrls.map((urlInfo: { title: string; url: string }, index: number) => (
          <Action.OpenInBrowser
            key={`${urlInfo.title}-${index}`}
            title={`Open ${urlInfo.title}`}
            url={urlInfo.url}
            icon={getFavicon(urlInfo.url, { fallback: Icon.Link })}
          />
        ))}
      </ActionPanel.Section>

      <RemoteWebPageAction.Menu remotes={context.remotes.data}>
        {(remote) => (
          <>
            <RemoteWebPageAction.Commit remote={remote} commit={context.commit} />

            {selectedBranch && <RemoteWebPageAction.Branch remote={remote} branch={selectedBranch} />}

            <RemoteWebPageAction.Branches
              remote={remote}
              branches={context.commit.remoteBranches
                // show only branches that are attached to the remote
                .filter((remoteBranch) => remoteBranch.remote === remote.name)
                .filter((remoteBranch) => remoteBranch.name !== selectedBranch)
                .map((remoteBranch) => remoteBranch.name)}
            />

            <RemoteWebPageAction.Tags remote={remote} tags={context.commit.tags} />

            <RemoteWebPageAction.Base remote={remote} />
          </>
        )}
      </RemoteWebPageAction.Menu>
    </ActionPanel.Submenu>
  );
}
