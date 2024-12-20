import { getPreferenceValues, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import React from "react";
import { ALERT } from "../const/toast_messages";
import { Preferences } from "../summarizeVideo";
import { useAnthropicSummary } from "./anthropic/useAnthropicSummary";
import { useOpenAISummary } from "./openai/useOpenAISummary";
import { useRaycastAISummary } from "./raycast/useRaycastAISummary";

type GetSummaryProps = {
  transcript?: string;
  setSummaryIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSummary: React.Dispatch<React.SetStateAction<string | undefined>>;
};

export const useGetSummary = async ({ transcript, setSummaryIsLoading, setSummary }: GetSummaryProps) => {
  const preferences = getPreferenceValues() as Preferences;
  const { chosenAi } = preferences;

  switch (chosenAi) {
    case "anthropic":
      useAnthropicSummary({ transcript, setSummaryIsLoading, setSummary });
      break;
    case "openai":
      useOpenAISummary({ transcript, setSummaryIsLoading, setSummary });
      break;
    case "raycastai":
      useRaycastAISummary({ transcript, setSummaryIsLoading, setSummary });
      break;
    default:
      showToast({
        style: Toast.Style.Failure,
        title: ALERT.title,
        message: "Please select an AI model in preferences.",
        primaryAction: {
          title: "Open Exetension Settings",
          onAction: () => openExtensionPreferences(),
        },
      });
      return;
  }

  if (!transcript) return;

  return null;
};
