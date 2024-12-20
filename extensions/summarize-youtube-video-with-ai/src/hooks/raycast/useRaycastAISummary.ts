import { AI, environment, getPreferenceValues, popToRoot, showToast, Toast } from "@raycast/api";
import React from "react";
import { ALERT, SUCCESS_SUMMARIZING_VIDEO, SUMMARIZING_VIDEO } from "../../const/toast_messages";
import { Preferences } from "../../summarizeVideo";
import { getAiInstructionSnippet } from "../../utils/getAiInstructionSnippets";

type GetRaycastAISummaryProps = {
  transcript?: string;
  setSummaryIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSummary: React.Dispatch<React.SetStateAction<string | undefined>>;
};

export const useRaycastAISummary = async ({
  transcript,
  setSummaryIsLoading,
  setSummary,
}: GetRaycastAISummaryProps) => {
  const preferences = getPreferenceValues() as Preferences;
  const { chosenAi, creativity, language } = preferences;

  if (chosenAi !== "raycastai") {
    return;
  }

  if (!environment.canAccess(AI)) {
    showToast({
      title: "No access to Raycast AI",
      message: "Raycast AI is required for this extension to work. You need Raycast Pro.",
      style: Toast.Style.Failure,
    });
    popToRoot();
    return;
  }

  if (!transcript) return;

  const aiInstructions = getAiInstructionSnippet(language, transcript, transcript);

  const raycastSummary = AI.ask(aiInstructions, {
    creativity: parseInt(creativity),
  });

  showToast({
    style: Toast.Style.Animated,
    title: SUMMARIZING_VIDEO.title,
    message: SUMMARIZING_VIDEO.message,
  });

  raycastSummary.on("data", (data) => {
    setSummary((result) => {
      if (result === undefined) return data;
      return result + data;
    });
  });

  raycastSummary.finally(() => {
    setSummaryIsLoading(false);
    showToast({
      style: Toast.Style.Success,
      title: SUCCESS_SUMMARIZING_VIDEO.title,
      message: SUCCESS_SUMMARIZING_VIDEO.message,
    });
  });

  raycastSummary.catch((error) => {
    showToast({
      style: Toast.Style.Failure,
      title: ALERT.title,
      message: error.message,
    });
  });

  return null;
};
