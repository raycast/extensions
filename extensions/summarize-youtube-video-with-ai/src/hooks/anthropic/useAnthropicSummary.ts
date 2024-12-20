import Anthropic from "@anthropic-ai/sdk";
import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import React from "react";
import { ALERT, SUCCESS_SUMMARIZING_VIDEO, SUMMARIZING_VIDEO } from "../../const/toast_messages";
import { Preferences } from "../../summarizeVideo";
import { getAiInstructionSnippet } from "../../utils/getAiInstructionSnippets";

type GetAnthropicSummaryProps = {
  transcript?: string;
  setSummaryIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSummary: React.Dispatch<React.SetStateAction<string | undefined>>;
};

export const useAnthropicSummary = async ({
  transcript,
  setSummaryIsLoading,
  setSummary,
}: GetAnthropicSummaryProps) => {
  const preferences = getPreferenceValues() as Preferences;
  const { chosenAi, anthropicApiToken, language } = preferences;

  if (!transcript) return;

  if (chosenAi !== "anthropic") {
    return;
  }

  if (anthropicApiToken === "") {
    showToast({
      title: ALERT.title,
      message:
        "Anthropic Developer Account is required for this extension to work. You need to add your API token in preferences.",
      style: Toast.Style.Failure,
    });
    return;
  }

  const anthropic = new Anthropic({
    apiKey: anthropicApiToken,
  });

  setSummaryIsLoading(true);

  const aiInstructions = getAiInstructionSnippet(language, transcript, transcript);

  showToast({
    style: Toast.Style.Animated,
    title: SUMMARIZING_VIDEO.title,
    message: SUMMARIZING_VIDEO.message,
  });

  const chatCompletion = anthropic.messages.stream({
    model: "claude-3-5-sonnet-latest",
    max_tokens: 8192,
    stream: true,
    messages: [{ role: "user", content: aiInstructions }],
  });

  chatCompletion.on("text", (delta) => {
    setSummary((result) => {
      if (result === undefined) return delta || undefined;
      return result + delta || result;
    });
  });

  chatCompletion.finalMessage().then(() => {
    setSummaryIsLoading(false);
    showToast({
      style: Toast.Style.Success,
      title: SUCCESS_SUMMARIZING_VIDEO.title,
      message: SUCCESS_SUMMARIZING_VIDEO.message,
    });
  });

  chatCompletion.on("error", (error) => {
    setSummaryIsLoading(false);
    showToast({
      style: Toast.Style.Failure,
      title: ALERT.title,
      message: error.message,
    });
  });
};
