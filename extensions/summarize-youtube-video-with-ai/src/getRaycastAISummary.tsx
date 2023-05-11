import { AI, Toast, environment, popToRoot, showToast } from "@raycast/api";
import { RAYCASTAI_SUMMARY_MAX_CHARS } from "./const";
import { splitTranscript } from "./utils";
import { useAI } from "@raycast/utils";

type GetRaycatsAISummaryProps = {
  videoTitle?: string;
  transcript?: string;
};

export default async function getRaycatsAISummary({ videoTitle, transcript }: GetRaycatsAISummaryProps) {
  let temporarySummary = "";
  const askAI =
    Boolean(videoTitle) && transcript && transcript.length > RAYCASTAI_SUMMARY_MAX_CHARS
      ? Boolean(temporarySummary)
      : Boolean(transcript);

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

      temporarySummary += await AI.ask(aiInstructions);
    }
  }

  console.log("temporarySummary", temporarySummary);

  const aiInstructions = `Summarize the following transcription of a youtube video as a list of the most important points each starting with a fitting emoji. Ignore mentions of video sponsors.
  
  Format:
  [Emoji] [List Item] [\n\n]
  Here is the transcript: ${temporarySummary.length > 0 ? temporarySummary : transcript}`;

  console.log("askAI", askAI);
  console.log(temporarySummary);

  const { data, isLoading, error } = useAI(aiInstructions, {
    execute: askAI,
    model: "gpt-3.5-turbo",
  });

  if (isLoading) {
    showToast({
      style: Toast.Style.Animated,
      title: "💡",
      message: "Summarizing the video",
    });
  }
  if (data && !isLoading) {
    showToast({
      style: Toast.Style.Success,
      title: "📝",
      message: "Video summarized!",
    });
  }
  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "🚨",
      message: error.message,
    });
  }

  return { summaryIsLoading: isLoading, summary: data, summaryError: error };
}
