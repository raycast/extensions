import { useState, useEffect } from "react";
import { getPreferenceValues } from "@raycast/api";
import { fetchAIContent } from "../../_lib/ai-utils";
import { ERROR_MESSAGES, PR_DESCRIPTION_PROMPT } from "../../_constants";

export function usePRDescription(userBaseBranch?: string) {
  const [description, setDescription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPRDescription();
  }, []);

  async function fetchPRDescription() {
    try {
      const preferences = await getPreferenceValues<{ [key: string]: string }>();
      const defaultBaseBranch = preferences["default-base-branch"];
      const baseBranch = userBaseBranch || defaultBaseBranch;

      const { aiContent, branchName } = await fetchAIContent({
        diffType: "baseBranch",
        aiModelName: "pr-description-ai-model",
        aiPrompt: PR_DESCRIPTION_PROMPT,
        baseBranch,
      });

      const cleanedDescription = cleanDescription(aiContent);
      setDescription(cleanedDescription);
      setBranchName(branchName);
    } catch (error) {
      const errorMessage = (error as Error).message || ERROR_MESSAGES.FETCH_PR_DESCRIPTION;
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return { description, error, branchName, isLoading };
}

function cleanDescription(aiContent: string): string {
  const cleanedMessage = aiContent.replace(/^```|```$/g, "").trim();
  const lines = cleanedMessage.split("\n").map((line) => line.trim());

  // Remove empty lines and filter out any remaining empty strings
  const nonEmptyLines = lines.filter(Boolean);

  // Remove "markdown" or "diff" if it's the only content on the first line
  if (nonEmptyLines.length > 0) {
    if (/^(markdown|diff)$/i.test(nonEmptyLines[0])) {
      nonEmptyLines.shift();
    } else {
      nonEmptyLines[0] = nonEmptyLines[0].replace(/^(markdown|diff):\s*/i, "");
    }
  }

  return nonEmptyLines.join("\n").trim();
}
