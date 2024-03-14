import { Action, ActionPanel, Clipboard, closeMainWindow, Detail, showToast, Toast, useNavigation } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { SummaryType, SummaryViewProps } from "../interfaces";
import { getCacheFilePath, saveToCache } from "../services/utils";
import { generateSummary } from "../services/apiCalls";

async function generateOneOnOneSummary(text: string): Promise<string> {
  const systemPrompt = "";
  "You are a helpful assistant generating a summary for a 1-1 meeting. Your task is to review the provided meeting notes and create a concise summary that captures the essential information, focusing on key takeaways and action items assigned to specific individuals during the meeting. " +
    "Use clear and professional language, and organize the summary in a logical manner using appropriate formatting such as headings, subheadings, and bullet points. " +
    "Ensure that the summary is easy to understand and provides a comprehensive but succinct overview of the meeting's content, with a particular focus on clearly indicating who is responsible for each action item." +
    "Remove the timestamps and try to identify the speakers (Speaker0 and Speaker1 are not real names)." +
    "Use simple sentences and abuse bullet points in markdown." +
    "DO NOT frame that it's a summary.";
  ("");
  const userPrompt = "Generate a 1-1 meeting summary:";

  return generateSummary("1-1", systemPrompt, userPrompt, text);
}

async function generateSlackPostSummary(text: string): Promise<string> {
  const systemPrompt =
    "You are a helpful assistant generating a summary for a Slack post. It is structured with a bold title, and then explanations. Use thanks, but no other forms of politeness. Use simple sentences and bullet points. Write in an empathetic tone. Use I.";
  const userPrompt = "Generate a Slack post as an answer with the following content:";

  return generateSummary("Slack post", systemPrompt, userPrompt, text);
}

async function generateStructuringThoughtsSummary(text: string): Promise<string> {
  const systemPrompt = "";
  "You are a helpful assistant generating a summary for structuring thoughts.Your task is to take the provided natural language description of a process or task and transform it into clear, concise step-by-step directions that are logical, sequential, and easy to follow. Use imperative language and begin each step with an action verb." +
    "Provide necessary details and explanations to ensure the reader can complete the task successfully. " +
    "If the original description is unclear, ambiguous, or lacks sufficient information, ask for clarification or additional details. " +
    "Use simple sentences and bullet points in markdown.";
  ("");
  const userPrompt = "Generate a summary to structure my thoughts:";

  return generateSummary("structuring thoughts", systemPrompt, userPrompt, text);
}

export async function generateCustomSummary(
  summaryType,
  customSystemPrompt,
  customUserPrompt,
  text: string,
): Promise<string> {
  return generateSummary(summaryType, customSystemPrompt, customUserPrompt, text);
}

function SummaryView({
  summaryType,
  cache,
  selectedMemo,
  showTimestamps,
  customSystemPrompt,
  customUserPrompt,
}: React.FC<
  SummaryViewProps & {
    onGenerateSummary: (summaryType: SummaryType, customSystemPrompt?: string, customUserPrompt?: string) => void;
    loading: boolean;
  }
>) {
  const [summary, setSummary] = useState<string | null>(null);
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);

  const handleGenerateSummary = async (
    summaryType: SummaryType,
    customSystemPrompt?: string,
    customUserPrompt?: string,
  ) => {
    setIsLoading(true);
    await showToast(Toast.Style.Animated, "Generating Summary...");

    let generatedSummary;
    switch (summaryType.value) {
      case "1-1":
        generatedSummary = await generateOneOnOneSummary(cache?.transcriptionResult.timestamps);
        break;
      case "slack":
        generatedSummary = await generateSlackPostSummary(
          showTimestamps ? cache?.transcriptionResult.timestamps : cache?.transcriptionResult.noTimestamps,
        );
        break;
      case "thoughts":
        generatedSummary = await generateStructuringThoughtsSummary(
          showTimestamps ? cache?.transcriptionResult.timestamps : cache?.transcriptionResult.noTimestamps,
        );
        break;
      case "custom":
        generatedSummary = await generateCustomSummary(
          summaryType,
          customSystemPrompt,
          customUserPrompt,
          showTimestamps ? cache?.transcriptionResult.timestamps : cache?.transcriptionResult.noTimestamps,
        );
        break;
      default:
        throw new Error("Invalid summary type selected");
    }
    const cacheFilePath = getCacheFilePath(selectedMemo.filePath);
    if (cache) {
      cache.transcriptionResult = {
        timestamps: cache.transcriptionResult.timestamps,
        noTimestamps: cache.transcriptionResult.noTimestamps,
        summary: generatedSummary,
      };
      saveToCache(cacheFilePath, cache);
    }

    await showToast(Toast.Style.Success, "Summary Generated", generatedSummary);

    setSummary(generatedSummary);
    setIsLoading(false);
  };

  useEffect(() => {
    const generateSummaryInView = async () => {
      if (!summary) {
        await handleGenerateSummary(summaryType, customSystemPrompt, customUserPrompt);
      }
    };
    generateSummaryInView();
  }, []);

  const handleCopyAndClose = async () => {
    await Clipboard.copy(summary || "");
    await closeMainWindow({ clearRootSearch: false });
    await showToast(Toast.Style.Success, "Copied to clipboard");
  };

  if (isLoading) {
    return <Detail markdown="# Generating summary..." />;
  }
  const summaryWithTitle = `# ${summaryType.label} Summary\n\n${summary}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={summaryWithTitle}
      actions={
        <ActionPanel>
          <Action title="Copy Summary" onAction={() => handleCopyAndClose()} />
          <Action title="Back" onAction={() => pop()} />
        </ActionPanel>
      }
    />
  );
}

export default SummaryView;
