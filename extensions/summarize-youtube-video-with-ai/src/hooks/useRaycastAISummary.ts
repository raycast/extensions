import React from "react";
import { AI, environment, getPreferenceValues, popToRoot, showToast, Toast } from "@raycast/api";
import { RAYCASTAI_SUMMARY_MAX_CHARS } from "../const/max_chars";
import splitTranscript from "../utils/splitTranscript";
import {
  ERROR_SUMMARIZING_VIDEO,
  LONG_VIDEO,
  SUCCESS_SUMMARIZING_VIDEO,
  SUMMARIZING_VIDEO,
} from "../const/toast_messages";
import { PreferenceValues } from "../summarizeVideo";

type GetRaycastAISummaryProps = {
  transcript?: string;
  setSummaryIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSummary: React.Dispatch<React.SetStateAction<string | undefined>>;
};

const useRaycastAISummary = async ({ transcript, setSummaryIsLoading, setSummary }: GetRaycastAISummaryProps) => {
  const preferences = getPreferenceValues() as PreferenceValues;
  const { chosenAi, creativity, language } = preferences;

  if (chosenAi !== "raycastai") {
    return;
  }

  let temporarySummary = "";

  if (!environment.canAccess(AI)) {
    showToast({
      title: "No access to Raycast AI",
      message: "Raycast AI is required for this extension to work. You need Raycast Pro.",
      style: Toast.Style.Failure,
    });
    popToRoot();
    return;
  }

  if (transcript && transcript?.length > RAYCASTAI_SUMMARY_MAX_CHARS) {
    showToast({
      style: Toast.Style.Animated,
      title: LONG_VIDEO.title,
      message: LONG_VIDEO.message,
    });

    setSummaryIsLoading(true);

    const splitTranscripts = splitTranscript(transcript, RAYCASTAI_SUMMARY_MAX_CHARS);

    const fetchAiAnswer = async (aiInstructions: string) => {
      return await AI.ask(aiInstructions);
    };

    for (const summaryBlock of splitTranscripts) {
      const index = splitTranscripts.indexOf(summaryBlock) + 1;
      const aiInstructions = `
      Summarize this transcription of a youtube video.
      The transcription is split into parts and this is part ${index} of ${splitTranscripts.length}.
      Be as concise as possible.
      Do not use more then ${RAYCASTAI_SUMMARY_MAX_CHARS / splitTranscripts.length} characters.
      
      Here is the transcript: ${summaryBlock}`;

      const result = await fetchAiAnswer(aiInstructions);

      temporarySummary += "\n" + result;
    }
  }

  const aiInstructions = `Summarize the following transcription of a youtube video as a list of the most important points each starting with a fitting emoji. Ignore mentions of video sponsors. Answer in ${language}.
  
  Format:

  [Emoji] [List Item] &nbsp;&nbsp;
  
  Here is the transcript: ${temporarySummary.length > 0 ? temporarySummary : transcript}`;

  const raycastSummary = AI.ask(aiInstructions, {
    model: "gpt-3.5-turbo",
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
      title: ERROR_SUMMARIZING_VIDEO.title,
      message: error.message,
    });
  });

  return null;
};

export default useRaycastAISummary;
