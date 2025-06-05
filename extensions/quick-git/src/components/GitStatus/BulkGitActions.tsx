import { Action, ActionPanel, Icon, Keyboard, showToast } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";

interface Props {
  repo: string;
  checkStatus: () => void;
}

export function BulkGitActions({ repo, checkStatus }: Props) {
  const { revalidate: stageAllFiles } = useExec("git", ["add", "."], {
    cwd: repo,
    execute: false,
    onData: () => {
      checkStatus();
      showToast({ title: "Added files" });
    },
    onError: (error) => {
      showFailureToast(error, { title: "Could not stage files" });
    },
  });
  const { revalidate: unstageAllFiles } = useExec("git", ["restore", "--staged", "."], {
    cwd: repo,
    execute: false,
    onData: () => {
      checkStatus();
      showToast({ title: "Unstaged files" });
    },
    onError: (error) => {
      showFailureToast(error, { title: "Could not unstage files" });
    },
  });
  const { revalidate: stashFiles } = useExec("git", ["stash"], {
    cwd: repo,
    execute: false,
    onData: () => {
      checkStatus();
      showToast({ title: "Stashed files" });
    },
    onError: (error) => {
      showFailureToast(error, { title: "Could not stash files" });
    },
  });

  return (
    <ActionPanel.Section title="Bulk Actions">
      <Action
        title="Add All Files"
        onAction={stageAllFiles}
        icon={Icon.PlusCircle}
        shortcut={{ key: "a", modifiers: ["cmd", "shift"] }}
      />
      <Action
        title="Restore Staged Files"
        onAction={unstageAllFiles}
        icon={Icon.MinusCircle}
        shortcut={Keyboard.Shortcut.Common.RemoveAll}
      />
      <Action title="Stash Files" onAction={stashFiles} icon={Icon.SaveDocument} />
    </ActionPanel.Section>
  );
}
