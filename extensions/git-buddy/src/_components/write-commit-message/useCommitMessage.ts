import { useState, useEffect } from "react";
import { fetchAIContent } from "../../_lib/ai-utils";
import { getRepoPath, getCurrentBranchName } from "../../_lib/git";
import { ERROR_MESSAGES } from "../../_constants";
import { COMMIT_MESSAGE_PROMPT } from "../../_constants/prompts";

export function useCommitMessage() {
  const [commitMessage, setCommitMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCommitMessage();
  }, []);

  async function fetchCommitMessage() {
    try {
      const repoPath = await getRepoPath();
      const { aiContent } = await fetchAIContent({
        diffType: "staged",
        aiModelName: "commit-message-ai-model",
        aiPrompt: COMMIT_MESSAGE_PROMPT,
      });
      const cleanedMessage = cleanCommitMessage(aiContent);
      setCommitMessage(cleanedMessage);
      setBranchName(await getCurrentBranchName(repoPath));
    } catch (error) {
      setError(ERROR_MESSAGES.FETCH_COMMIT_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  }

  return { commitMessage, error, branchName, isLoading };
}

function cleanCommitMessage(aiContent: string): string {
  return aiContent.replace(/[`"'.,]/g, "");
}
