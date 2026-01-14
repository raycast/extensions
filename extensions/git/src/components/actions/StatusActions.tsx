import { Action, Icon, Color, Alert, ActionPanel, Toast, showToast } from "@raycast/api";
import { RepositoryContext } from "../../open-repository";
import { confirmAlert } from "@raycast/api";
import { Commit, FileStatus } from "../../types";
import { CommitMessageForm } from "../views/CommitMessageView";
import FileMergeResolveView from "../views/FileMergeResolveView";
import { existsSync } from "fs";
import { basename } from "path";
import { useMemo } from "react";
import { FileStatusIcon } from "../icons/StatusIcons";
import { RemoteWebPageAction } from "./RemoteActions";
import { useIssueTracker } from "../../hooks/useIssueTracker";
import { getFavicon } from "@raycast/utils";

/**
 * Action for resolving conflicts in a file.
 */
export function FileResolveConflictAction(context: RepositoryContext & { file: FileStatus }) {
  if (!context.file.isConflicted) {
    return undefined;
  }

  const conflictState = useMemo(() => {
    const otherStatus = context.status.data.files.find(
      (f) => f.absolutePath === context.file.absolutePath && f.status !== context.file.status,
    );
    if (!otherStatus) {
      return undefined;
    }

    const staged = context.file.status === "staged" ? context.file : otherStatus;
    const unstaged = context.file.status === "unstaged" ? context.file : otherStatus;

    return { staged, unstaged };
  }, [context.file]);

  if (!conflictState) {
    return undefined;
  }

  const bothModified = conflictState.staged.type === "modified" && conflictState.unstaged.type === "modified";
  if (bothModified) {
    return (
      <Action.Push
        title="Resolve Conflicts"
        icon={{ source: Icon.Wand, tintColor: Color.Yellow }}
        target={<FileMergeResolveView {...context} filePath={context.file.absolutePath} />}
      />
    );
  }

  const handleResolve = async (side: "ours" | "theirs") => {
    const confirmed = await confirmAlert({
      title: "Apply Resolved Changes",
      message: `Are you sure you want to apply selected resolution to "${basename(context.file.absolutePath)}"?`,
      primaryAction: {
        title: "Apply",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    const selectedFileVersion = side === "ours" ? conflictState.staged : conflictState.unstaged;

    try {
      if (selectedFileVersion.type === "deleted") {
        await context.gitManager.removeFile(selectedFileVersion.absolutePath);
      } else {
        await context.gitManager.resolveConflict(selectedFileVersion.absolutePath, side);
        await context.gitManager.stageFile(selectedFileVersion.absolutePath);
      }
      context.status.revalidate();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to apply resolution",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <ActionPanel.Submenu title="Resolve Conflicts with" icon={{ source: Icon.Wand, tintColor: Color.Yellow }}>
      <Action
        // eslint-disable-next-line @raycast/prefer-title-case
        title={`Local ${conflictState.staged.type} version`}
        icon={FileStatusIcon({ ...conflictState.staged, isConflicted: false })}
        onAction={() => handleResolve("ours")}
      />
      <Action
        // eslint-disable-next-line @raycast/prefer-title-case
        title={`Remote ${conflictState.unstaged.type} version`}
        icon={FileStatusIcon({ ...conflictState.unstaged, isConflicted: false })}
        onAction={() => handleResolve("theirs")}
      />
    </ActionPanel.Submenu>
  );
}

/**
 * Action for staging a file.
 */
export function FileStageAction(context: RepositoryContext & { file: FileStatus }) {
  const handleStageFile = async () => {
    if (context.file.isConflicted) {
      const confirmed = await confirmAlert({
        title: "Mark as Resolved",
        message: `Are you sure you want to mark "${basename(context.file.absolutePath)}" as resolved remaining conflicts unresolved?`,
        primaryAction: {
          title: "Resolved",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (!confirmed) return;
    }

    try {
      await context.gitManager.stageFile(context.file.relativePath);
      context.status.revalidate();
    } catch {
      // Git error is already shown by GitManager
    }
  };

  return (
    <Action
      title={context.file.isConflicted ? "Mark as Resolved" : "Stage"}
      onAction={handleStageFile}
      style={context.file.isConflicted ? Action.Style.Destructive : Action.Style.Regular}
      icon={context.file.isConflicted ? Icon.CheckRosette : Icon.Plus}
    />
  );
}

/**
 * Action for unstaging a file.
 */
export function FileUnstageAction(context: RepositoryContext & { file: FileStatus }) {
  const handleUnstageFile = async () => {
    try {
      await context.gitManager.unstageFile(context.file.relativePath);
      context.status.revalidate();
    } catch {
      // Git error is already shown by GitManager
    }
  };

  return <Action title="Unstage" onAction={handleUnstageFile} icon={Icon.Minus} />;
}

/**
 * Action for discarding changes to a file.
 */
export function FileDiscardAction(context: RepositoryContext & { file: FileStatus }) {
  if (context.file.type === "added" && existsSync(context.file.absolutePath)) {
    return (
      <Action.Trash
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
        paths={[context.file.absolutePath]}
        onTrash={context.status.revalidate}
      />
    );
  }

  const handleDiscardChanges = async () => {
    const confirmed = await confirmAlert({
      title: "Discard changes",
      message: `Are you sure you want to discard changes in file "${basename(context.file.absolutePath)}"? This action cannot be undone.`,
      primaryAction: {
        title: "Discard",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await context.gitManager.discardChanges(context.file.relativePath);
        context.status.revalidate();
      } catch {
        // Git error is already shown by GitManager
      }
    }
  };

  return (
    <Action
      title="Discard Changes"
      onAction={handleDiscardChanges}
      icon={Icon.ArrowCounterClockwise}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
    />
  );
}

/**
 * Action for restoring a file to a previous commit.
 */
export function FileRestoreAction(context: RepositoryContext & { filePath: string; before?: boolean; commit: Commit }) {
  const handleRestore = async () => {
    const confirmed = await confirmAlert({
      title: context.before ? "Restore File to Before Commit" : "Restore File to This Commit",
      message: `Are you sure you want to restore '${basename(context.filePath)}' to commit ${context.commit}? This will modify the working tree`,
      primaryAction: {
        title: "Restore",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;
    try {
      await context.gitManager.restoreFileToCommit(
        context.filePath,
        context.before ? `${context.commit.hash}^` : context.commit.hash,
      );
      context.status.revalidate();
    } catch {
      // Error toast is shown by GitManager
    }
  };

  return (
    <Action
      title={context.before ? "Restore File to Before Commit" : "Restore File to This Commit"}
      icon={Icon.RotateClockwise}
      style={Action.Style.Destructive}
      onAction={handleRestore}
    />
  );
}

/**
 * Action for staging all files.
 */
export function FileStageAllAction(context: RepositoryContext) {
  const handleStageAll = async () => {
    try {
      await context.gitManager.stageAll();
      context.status.revalidate();
    } catch {
      // Git error is already shown by GitManager
    }
  };

  return (
    <Action
      title="Stage All Files"
      onAction={handleStageAll}
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
    />
  );
}

/**
 * Action for unstaging all files.
 */
export function FileUnstageAllAction(context: RepositoryContext) {
  const handleUnstageAll = async () => {
    try {
      await context.gitManager.unstageAll();
      context.status.revalidate();
    } catch {
      // Git error is already shown by GitManager
    }
  };

  return (
    <Action
      title="Unstage All Files"
      onAction={handleUnstageAll}
      icon={Icon.Minus}
      shortcut={{ modifiers: ["cmd", "shift"], key: "z" }}
    />
  );
}

/**
 * Action for discarding all changes.
 */
export function FileDiscardAllAction(context: RepositoryContext) {
  const handleDiscardAll = async () => {
    const confirmed = await confirmAlert({
      title: "Discard All Changes",
      message: "Are you sure you want to discard all unstaged changes? This action cannot be undone.",
      primaryAction: {
        title: "Discard",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await context.gitManager.discardAllChanges();
        context.status.revalidate();
      } catch {
        // Git error is already shown by GitManager
      }
    }
  };

  return (
    <Action
      title="Discard All Changes"
      onAction={handleDiscardAll}
      icon={Icon.ArrowCounterClockwise}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["ctrl", "cmd"], key: "x" }}
    />
  );
}

/**
 * Action to commit changes or continue a rebase/merge.
 */
export function CommitChangesAction(context: RepositoryContext) {
  const hasConflictedFiles = context.status.data?.files.some((f) => f.isConflicted);
  if (hasConflictedFiles) {
    return undefined; // Don't show if there are still conflicts
  }

  switch (context.status.data.mode.kind) {
    case "regular":
    case "squash": {
      const hasStagedFiles = context.status.data?.files.some((f) => f.status === "staged");
      if (!context.branches.data.currentBranch) return undefined;

      return (
        <>
          {hasStagedFiles && (
            <Action.Push
              title="Commit Staged Changes"
              icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
              target={<CommitMessageForm {...context} />}
              shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            />
          )}
          <Action.Push
            title="Commit All Changes"
            icon={{ source: Icon.Checkmark, tintColor: Color.Yellow }}
            target={<CommitMessageForm {...context} />}
            shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "enter" }}
            onPush={async () => {
              await context.gitManager.stageAll();
              context.status.revalidate();
            }}
          />
        </>
      );
    }
    case "rebase": {
      const handleContinueRebase = async () => {
        try {
          await context.gitManager.continueRebase();
        } catch {
          // Git error is already shown by GitManager
        }
        context.status.revalidate();
        context.branches.revalidate();
        context.commits.revalidate();
      };
      return (
        <Action
          title="Continue Rebase"
          onAction={handleContinueRebase}
          icon={{ source: Icon.ArrowRight, tintColor: Color.Blue }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
        />
      );
    }
    case "merge": {
      const handleCommitMerge = async () => {
        try {
          await context.gitManager.commitMerge();
        } catch {
          // Git error is already shown by GitManager
        }
        context.status.revalidate();
        context.branches.revalidate();
        context.commits.revalidate();
      };

      return (
        <Action
          title="Commit Merge"
          onAction={handleCommitMerge}
          icon={{ source: Icon.Check, tintColor: Color.Green }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
        />
      );
    }
    case "cherryPick": {
      const handleCommitCherryPick = async () => {
        try {
          await context.gitManager.continueCherryPick();
        } catch {
          // Git error is already shown by GitManager
        }
        context.status.revalidate();
        context.branches.revalidate();
        context.commits.revalidate();
      };

      return (
        <Action
          title="Continue Cherry Pick"
          onAction={handleCommitCherryPick}
          icon={{ source: Icon.Check, tintColor: Color.Green }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
        />
      );
    }
    case "revert": {
      const handleCommitRevert = async () => {
        try {
          await context.gitManager.continueRevert();
        } catch {
          // Git error is already shown by GitManager
        }
        context.status.revalidate();
        context.branches.revalidate();
        context.commits.revalidate();
      };

      return (
        <Action
          title="Continue Revert"
          onAction={handleCommitRevert}
          icon={{ source: Icon.Check, tintColor: Color.Green }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
        />
      );
    }
  }
}

/**
 * Action to abort a rebase or merge.
 */
export function ConflictAbortAction(context: RepositoryContext) {
  switch (context.status.data.mode.kind) {
    case "rebase":
      return (
        <Action
          title="Abort Rebase"
          onAction={async () => {
            const confirmed = await confirmAlert({
              title: "Abort Rebase",
              message: "Are you sure you want to abort the rebase? This action cannot be undone.",
              primaryAction: {
                title: "Abort",
                style: Alert.ActionStyle.Destructive,
              },
            });

            if (confirmed) {
              await context.gitManager.abortRebase();
              context.status.revalidate();
            }
          }}
          icon={Icon.XMarkCircleHalfDash}
          style={Action.Style.Destructive}
        />
      );

    case "merge":
      return (
        <Action
          title="Abort Merge"
          onAction={async () => {
            const confirmed = await confirmAlert({
              title: "Abort Merge",
              message: "Are you sure you want to abort the merge? This action cannot be undone.",
              primaryAction: {
                title: "Abort",
                style: Alert.ActionStyle.Destructive,
              },
            });

            if (confirmed) {
              await context.gitManager.abortMerge();
              context.status.revalidate();
            }
          }}
          icon={Icon.XMarkCircleHalfDash}
          style={Action.Style.Destructive}
        />
      );

    case "cherryPick":
      return (
        <Action
          title="Abort Cherry Pick"
          onAction={async () => {
            const confirmed = await confirmAlert({
              title: "Abort Cherry Pick",
              message: "Are you sure you want to abort the cherry pick? This action cannot be undone.",
              primaryAction: {
                title: "Abort",
                style: Alert.ActionStyle.Destructive,
              },
            });

            if (confirmed) {
              await context.gitManager.abortCherryPick();
              context.status.revalidate();
            }
          }}
          icon={Icon.XMarkCircleHalfDash}
          style={Action.Style.Destructive}
        />
      );

    case "revert":
      return (
        <Action
          title="Abort Revert"
          onAction={async () => {
            const confirmed = await confirmAlert({
              title: "Abort Revert",
              message: "Are you sure you want to abort the revert? This action cannot be undone.",
              primaryAction: {
                title: "Abort",
                style: Alert.ActionStyle.Destructive,
              },
            });
            if (confirmed) {
              await context.gitManager.abortRevert();
              context.status.revalidate();
            }
          }}
          icon={Icon.XMarkCircleHalfDash}
          style={Action.Style.Destructive}
        />
      );
    case "squash":
    case "regular":
      return undefined;
  }
}

/**
 * Action for opening the attached links of a file.
 */
export function FileAttachedLinksAction(
  context: RepositoryContext & {
    filePath: string;
    commit?: Pick<Commit, "hash" | "message">;
  },
) {
  const { findUrls } = useIssueTracker();

  const commitUrls = useMemo(() => {
    if (!context.commit) {
      return [];
    }

    return findUrls(context.commit.message);
  }, [context.commit?.message]);

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
            <RemoteWebPageAction.File
              remote={remote}
              filePath={context.filePath}
              ref={context.commit?.hash ?? context.branches.data.currentBranch?.upstream?.name}
            />
            <RemoteWebPageAction.Base remote={remote} />
          </>
        )}
      </RemoteWebPageAction.Menu>
    </ActionPanel.Submenu>
  );
}
