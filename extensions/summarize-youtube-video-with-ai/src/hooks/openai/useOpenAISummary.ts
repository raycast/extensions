import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import OpenAI from "openai";
import React from "react";
import { ALERT, SUCCESS_SUMMARIZING_VIDEO, SUMMARIZING_VIDEO } from "../../const/toast_messages";
import { Preferences } from "../../summarizeVideo";
import { getAiInstructionSnippet } from "../../utils/getAiInstructionSnippets";

type GetOpenAISummaryProps = {
  transcript?: string;
  setSummaryIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSummary: React.Dispatch<React.SetStateAction<string | undefined>>;
};

export const useOpenAISummary = async ({ transcript, setSummaryIsLoading, setSummary }: GetOpenAISummaryProps) => {
  const preferences = getPreferenceValues() as Preferences;
  const { chosenAi, creativity, openaiApiToken, language } = preferences;

  if (!transcript) return;

  if (chosenAi !== "openai") {
    return;
  }

  if (openaiApiToken === "") {
    showToast({
      title: ALERT.title,
      message:
        "OpenAI Developer Account is required for this extension to work. You need to add your API token in preferences.",
      style: Toast.Style.Failure,
    });
    return;
  }

  const openai = new OpenAI({
    apiKey: openaiApiToken,
  });

  setSummaryIsLoading(true);

  const aiInstructions = getAiInstructionSnippet(language, transcript, transcript);

  showToast({
    style: Toast.Style.Animated,
    title: SUMMARIZING_VIDEO.title,
    message: SUMMARIZING_VIDEO.message,
  });

  const chatCompletion = openai.beta.chat.completions.stream({
    model: "gpt-4o",
    temperature: parseInt(creativity),
    messages: [{ role: "user", content: aiInstructions }],
    stream: true,
  });

  chatCompletion.on("content", (delta) => {
    setSummary((result) => {
      if (result === undefined) return delta || undefined;
      return result + delta || result;
    });
  });

  chatCompletion.finalChatCompletion().then(() => {
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
