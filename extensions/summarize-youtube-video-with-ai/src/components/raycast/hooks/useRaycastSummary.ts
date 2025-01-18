import { AI, environment, getPreferenceValues, popToRoot, showToast, Toast } from "@raycast/api";
import React, { useEffect } from "react";
import { ALERT, SUCCESS_SUMMARIZING_VIDEO, SUMMARIZING_VIDEO } from "../../../const/toast_messages";

import { RaycastPreferences } from "../../../summarizeVideoWithRaycast";
import { getAiInstructionSnippet } from "../../../utils/getAiInstructionSnippets";

type GetRaycastSummaryProps = {
  transcript?: string;
  setSummaryIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSummary: React.Dispatch<React.SetStateAction<string | undefined>>;
};

export const useRaycastSummary = async ({ transcript, setSummaryIsLoading, setSummary }: GetRaycastSummaryProps) => {
  const preferences = getPreferenceValues() as RaycastPreferences;
  const { creativity, language } = preferences;

  if (!environment.canAccess(AI)) {
    showToast({
      title: "No access to Raycast Pro",
      message: "Raycast Pro is required for this extension to work. You need Raycast Pro.",
      style: Toast.Style.Failure,
    });
    popToRoot();
    return;
  }

  useEffect(() => {
    if (!transcript) return;

    const aiInstructions = getAiInstructionSnippet(language, transcript, transcript);

    const raycastSummary = AI.ask(aiInstructions, {
      creativity: parseInt(creativity),
    });

    setSummaryIsLoading(true);

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
  }, [transcript]);
};
