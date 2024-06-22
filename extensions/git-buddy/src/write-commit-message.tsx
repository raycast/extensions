import { useState, useEffect } from "react";
import { Action, ActionPanel, Detail, Icon, popToRoot, showToast } from "@raycast/api";
import { commitChanges, getRepoPath, getCurrentBranchName } from "./_lib/git-utils";
import { fetchAIContent } from "./_lib/ai-utils";
import { handleError } from "./_lib/error-utils";

const AI_PROMPT = `Please write a commit message given the provided diff. The commit message should be a short description in the present tense and imperative form, as if giving a command. For example, "Add Button component" or "Fix issue with login form validation". IMPORTANT: The entire generated message should be 50 characters or less. Diff: `;
const ERROR_MESSAGE = "Failed to generate commit message.";
const COMMIT_SUCCESS_MESSAGE = "Changes committed to the repository.";
const COMMIT_ERROR_MESSAGE = "Failed to commit changes.";

export default function Command() {
  const [commitMessage, setCommitMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string | null>(null);

  useEffect(() => {
    fetchCommitMessage();
  }, []);

  useEffect(() => {
    if (error) {
      const handleAsyncError = async () => {
        await handleError(error);
      };
      handleAsyncError();
    }
  }, [error]);

  async function fetchCommitMessage() {
    try {
      const repoPath = await getRepoPath();
      const { aiContent } = await fetchAIContent({
        diffType: "staged",
        aiModelName: "commit-message-ai-model",
        aiPrompt: AI_PROMPT,
      });
      const cleanedMessage = cleanCommitMessage(aiContent);
      setCommitMessage(cleanedMessage);
      setBranchName(await getCurrentBranchName(repoPath));
    } catch (error) {
      setError(ERROR_MESSAGE);
    }
  }

  async function handleCommitChanges(commitMessage: string) {
    try {
      const repoPath = await getRepoPath();
      if (repoPath && commitMessage) {
        await commitChanges(repoPath, commitMessage);
      }
      await popToRoot({ clearSearchBar: true });
      await showToast({ title: "Changes committed", message: COMMIT_SUCCESS_MESSAGE });
    } catch (error) {
      setError(COMMIT_ERROR_MESSAGE);
    }
  }

  return (
    <Detail
      markdown={commitMessage || "Generating commit message..."}
      metadata={
        branchName && commitMessage ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Active Branch" text={branchName} />
          </Detail.Metadata>
        ) : null
      }
      actions={
        commitMessage ? (
          <ActionPanel title={branchName ? `Active Branch: ${branchName}` : undefined}>
            <Action
              title="Commit Changes"
              onAction={() => handleCommitChanges(commitMessage)}
              autoFocus={true}
              icon={Icon.CheckCircle}
            />
            <Action.CopyToClipboard
              title="Copy Commit Message"
              content={commitMessage}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel>
        ) : null
      }
    />
  );
}

// Clean AI-generated commit message by removing unwanted characters
function cleanCommitMessage(aiContent: string): string {
  return aiContent.replace(/[`"'.,]/g, "");
}
