import { Action, ActionPanel, Icon, Keyboard, launchCommand, LaunchType, showToast } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useCallback, useMemo } from "react";
import { GitCommit } from "../GitCommit.js";
import { RemoteGitActions } from "./RemoteGitActions.js";
import { BulkGitActions } from "./BulkGitActions.js";
import { GitBranch } from "../GitBranch/GitBranch.js";
import { join } from "node:path";

interface Props {
  isNotStaged: boolean;
  isCommittedFile: boolean;
  fileName: string;
  repo: string;
  checkStatus: () => void;
}

export function GitStatusItemActions({ isNotStaged, isCommittedFile, fileName, repo, checkStatus }: Props) {
  const { revalidate: addFile } = useExec("git", ["add", fileName], {
    cwd: repo,
    execute: false,
    onData: () => {
      checkStatus();
      showToast({ title: `Added ${fileName}` });
    },
    onError: (error) => {
      showFailureToast(error, { title: `Could not stage ${fileName}` });
    },
  });
  const { revalidate: unstageFile } = useExec("git", ["restore", "--staged", fileName], {
    cwd: repo,
    execute: false,
    onData: () => {
      checkStatus();
      showToast({ title: `Unstaged ${fileName}` });
    },
    onError: (error) => {
      showFailureToast(error, { title: `Could not unstage ${fileName}` });
    },
  });
  const { revalidate: restoreFile } = useExec("git", ["restore", fileName], {
    cwd: repo,
    execute: false,
    onData: () => {
      checkStatus();
      showToast({ title: `Restored ${fileName} to its previous state` });
    },
    onError: (error) => {
      showFailureToast(error, { title: `Could not restore ${fileName}` });
    },
  });

  const mainAction = useCallback(() => {
    if (isNotStaged) {
      addFile();
    } else {
      unstageFile();
    }
  }, [isNotStaged, addFile, unstageFile]);

  const filePath = useMemo(() => join(repo, fileName), [fileName, repo]);

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          icon={isNotStaged ? Icon.Plus : Icon.Minus}
          title={isNotStaged ? "Add" : "Unstage"}
          onAction={mainAction}
        />
        <Action.Push icon={Icon.Pencil} title="Commit" target={<GitCommit repo={repo} checkStatus={checkStatus} />} />
        {isNotStaged && isCommittedFile ? (
          <Action icon={Icon.Undo} title="Restore File" onAction={restoreFile} />
        ) : null}
      </ActionPanel.Section>
      <Action.Push
        icon={Icon.Switch}
        title="Switch Branch"
        shortcut={{ key: "b", modifiers: ["cmd"] }}
        target={<GitBranch repo={repo} checkStatus={checkStatus} />}
      />
      <BulkGitActions repo={repo} checkStatus={checkStatus} />
      <RemoteGitActions repo={repo} checkStatus={checkStatus} />
      <ActionPanel.Section title="Utilities">
        <Action
          icon={Icon.Folder}
          title="Change Current Repo"
          onAction={() =>
            launchCommand({
              name: "set-repo",
              type: LaunchType.UserInitiated,
            })
          }
        />
        <Action.CopyToClipboard title="Copy Filename" content={fileName} shortcut={Keyboard.Shortcut.Common.Copy} />
        <Action.Open title="Open File" target={filePath} shortcut={Keyboard.Shortcut.Common.Open} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
