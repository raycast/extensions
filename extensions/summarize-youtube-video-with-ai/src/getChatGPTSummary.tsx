import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import { Configuration, OpenAIApi } from "openai";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { CHATGPT_SUMMARY_MAX_CHARS } from "./const";
import { splitTranscript } from "./utils";

type GetChatGPTSummaryProps = {
  videoTitle?: string;
  transcript?: string;
};

export default async function getChatGPTSummary({ videoTitle, transcript }: GetChatGPTSummaryProps) {
  const [summary, setSummary] = useState<string | undefined>(undefined);

  const preferences = getPreferenceValues();

  const configuration = new Configuration({
    apiKey: preferences.openaiApiToken,
  });
  const openai = new OpenAIApi(configuration);
  let temporarySummary = "";
  let openAiInstructions = "";

  const { isLoading } = usePromise(
    async () => {
      showToast({
        style: Toast.Style.Animated,
        title: "💡",
        message: "Summarizing the video",
      });

      if (transcript && transcript?.length > CHATGPT_SUMMARY_MAX_CHARS) {
        showToast({
          style: Toast.Style.Animated,
          title: "❗",
          message: "That's a long video, hold on.",
        });

        const transcriptionSummary = splitTranscript(transcript, CHATGPT_SUMMARY_MAX_CHARS);

        for (const summaryBlock of transcriptionSummary) {
          const index = transcriptionSummary.indexOf(summaryBlock) + 1;
          const openAiInstructionBlock = `
          Summarize this transcription of a youtube video.
          The transcription is split into parts and this is part ${index} of ${transcriptionSummary.length}.
          Be as concise as possible.
          Do not use more then ${CHATGPT_SUMMARY_MAX_CHARS / transcriptionSummary.length} characters.

          Here is the transcript: ${summaryBlock}`;

          openAiInstructionBlock &&
            (await openai
              .createChatCompletion({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: openAiInstructionBlock }],
              })
              .then((result) => {
                temporarySummary += result.data.choices[0].message?.content;
              })
              .catch((error) => {
                console.error(error.request.res);
                showToast({
                  style: Toast.Style.Failure,
                  title: "🚨",
                  message: error.message,
                });
              }));
        }
      }

      openAiInstructions +=
        videoTitle &&
        transcript &&
        `Summarize the following transcription of a youtube video as a list of the most important points each starting with a fitting emoji. Ignore mentions of video sponsors.

        Format:
        [Emoji] [List Item] [\n\n]

        Here is the transcript: ${temporarySummary.length > 0 ? temporarySummary : transcript}`;

      openAiInstructions &&
        (await openai
          .createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: openAiInstructions }],
          })
          .then((result) => {
            showToast({
              style: Toast.Style.Success,
              title: "📝",
              message: "Video summarized!",
            });
            setSummary(result.data.choices[0].message?.content);
          })
          .catch((error) => {
            showToast({
              style: Toast.Style.Failure,
              title: "🚨",
              message: error.message,
            });
            console.error(error.request.res);
          }));
    },
    [],
    {
      execute: Boolean(transcript),
    }
  );

  return { summaryIsLoading: isLoading, summary };
}
