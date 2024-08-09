import { useState, useEffect } from "react";
import { Action, ActionPanel, Detail, LaunchProps, getPreferenceValues } from "@raycast/api";
import { fetchAIContent } from "./_lib/ai-utils";
import { handleError } from "./_lib/error-utils";

const AI_PROMPT = `You are a world class software engineer. I need your help writing a PR description, using this diff:
{diff}

Use this markdown template:
\`\`\`
## Summary

Provide a concise summary of the implemented changes, including new features, bug fixes, and any updates to components or properties.

## Changes

List the main changes made in this PR.
\`\`\`

Write a concise and clear PR description using the markdown template. Don't add any extra text to the response. Only respond in markdown.`;

const ERROR_MESSAGE = "Failed to generate PR description.";

interface LaunchContext {
  targetBranch: string;
}

export default function Command(props: LaunchProps<{ launchContext: LaunchContext }>) {
  const [description, setDescription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string | null>(null);

  useEffect(() => {
    fetchPRDescription();
  }, []);

  useEffect(() => {
    if (error) {
      const handleAsyncError = async () => {
        await handleError(error);
      };
      handleAsyncError();
    }
  }, [error]);

  async function fetchPRDescription() {
    try {
      const userTargetBranch = props.launchContext?.targetBranch;
      const preferences = await getPreferenceValues<{ [key: string]: string }>();
      const defaultTargetBranch = preferences["default-target-branch"];
      const targetBranch = userTargetBranch || defaultTargetBranch;

      // Fetch AI-generated PR description based on the diff
      const { aiContent, branchName } = await fetchAIContent({
        diffType: "targetBranch",
        aiModelName: "pr-description-ai-model",
        aiPrompt: AI_PROMPT,
        targetBranch,
      });

      const cleanedDescription = cleanDescription(aiContent);
      setDescription(cleanedDescription);
      setBranchName(branchName);
    } catch (error) {
      const errorMessage = (error as Error).message || ERROR_MESSAGE;
      setError(errorMessage);
    }
  }

  return (
    <Detail
      markdown={description || "Generating PR description..."}
      actions={
        description ? (
          <ActionPanel title={branchName ? `Branch: ${branchName}` : "Branch name"}>
            <Action.Paste title="Paste PR Description" content={description} />
            <Action.CopyToClipboard
              title="Copy PR Description"
              content={description}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel>
        ) : null
      }
    />
  );
}

// Clean AI-generated description by removing markdown code blocks and trimming lines
function cleanDescription(aiContent: string): string {
  const cleanedMessage = aiContent.replace(/^```|```$/g, "").trim();
  const lines = cleanedMessage.split("\n").map((line) => line.trim());
  if (lines.length > 0) {
    lines[0] = lines[0].replace(/markdown|diff/i, "").trim();
  }
  return lines.join("\n");
}
