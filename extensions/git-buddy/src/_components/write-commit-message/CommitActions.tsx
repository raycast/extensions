import { Action, ActionPanel, Icon, popToRoot, showToast } from "@raycast/api";
import { commitChanges, getRepoPath } from "../../_lib/git";
import { ERROR_MESSAGES } from "../../_constants";
import { COMMIT_SUCCESS_MESSAGE } from "../../_constants/success";

interface CommitActionsProps {
  commitMessage: string;
  branchName: string | null;
  onError: (error: string) => void;
}

export function CommitActions({ commitMessage, branchName, onError }: CommitActionsProps) {
  async function handleCommitChanges() {
    try {
      const repoPath = await getRepoPath();
      if (repoPath && commitMessage) {
        await commitChanges(repoPath, commitMessage);
      }
      await popToRoot({ clearSearchBar: true });
      await showToast({ title: "Changes committed", message: COMMIT_SUCCESS_MESSAGE });
    } catch (error) {
      onError(ERROR_MESSAGES.COMMIT_CHANGES);
    }
  }

  return (
    <ActionPanel title={branchName ? `Active Branch: ${branchName}` : undefined}>
      <Action title="Commit Changes" onAction={handleCommitChanges} autoFocus={true} icon={Icon.CheckCircle} />
      <Action.CopyToClipboard
        title="Copy Commit Message"
        content={commitMessage}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
    </ActionPanel>
  );
}
