import React from "react";
import { AI, Toast, environment, popToRoot, showToast } from "@raycast/api";
import { RAYCASTAI_SUMMARY_MAX_CHARS } from "../const/max_chars";
import splitTranscript from "../utils/splitTranscript";

type GetRaycastAISummaryProps = {
  transcript?: string;
  setSummaryIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSummary: React.Dispatch<React.SetStateAction<string | undefined>>;
};

async function fetchAiAnswer(aiInstructions: string) {
  return await AI.ask(aiInstructions);
}

const useRaycastAISummary = ({ transcript, setSummaryIsLoading, setSummary }: GetRaycastAISummaryProps) => {
  let temporarySummary = "";

  // if (!environment.canAccess(AI)) {
  //   showToast({
  //     title: "No access to Raycast AI",
  //     message: "Raycast AI is required for this extension to work. You need Raycast Pro.",
  //     style: Toast.Style.Failure,
  //   });
  //   popToRoot();
  //   return;
  // }

  if (transcript && transcript?.length > RAYCASTAI_SUMMARY_MAX_CHARS) {
    showToast({
      style: Toast.Style.Animated,
      title: "❗",
      message: "That's a long video, hold on.",
    });

    const splitTranscripts = splitTranscript(transcript, RAYCASTAI_SUMMARY_MAX_CHARS);

    for (const summaryBlock of splitTranscripts) {
      const index = splitTranscripts.indexOf(summaryBlock) + 1;
      const aiInstructions = `
        Summarize this transcription of a youtube video.
        The transcription is split into parts and this is part ${index} of ${splitTranscripts.length}.
        Be as concise as possible.
        Do not use more then ${RAYCASTAI_SUMMARY_MAX_CHARS / splitTranscripts.length} characters.
        
        Here is the transcript: ${summaryBlock}`;

      const result = fetchAiAnswer(aiInstructions);

      temporarySummary += "\n" + result;
      console.log("temporarySummary", temporarySummary);
    }
  }

  const aiInstructions = `Summarize the following transcription of a youtube video as a list of the most important points each starting with a fitting emoji. Ignore mentions of video sponsors.
  
  Format:
  [Emoji] [List Item] [\n\n]
  Here is the transcript: ${temporarySummary.length > 0 ? temporarySummary : transcript}`;

  const raycastSummary = AI.ask(aiInstructions, {
    model: "gpt-3.5-turbo",
  });

  raycastSummary.on("data", (data) => {
    console.log("data", data);
    setSummaryIsLoading(true);
    setSummary((result) => result + data);
  });

  raycastSummary.finally(() => {
    setSummaryIsLoading(false);
  });

  return null;
};

export default useRaycastAISummary;
