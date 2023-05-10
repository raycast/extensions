import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import { Configuration, OpenAIApi } from "openai";
import getVideoTranscript from "./getVideoTranscript";
import { usePromise } from "@raycast/utils";
import { useState } from "react";

const SUMMARY_MAX_CHARS = 12000;

export default async function getChatGPTSummary(video: string, videoTitle?: string) {
  const [summary, setSummary] = useState<string | undefined>(undefined);

  const { transcriptLoading, rawTranscript } = getVideoTranscript(video);

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

      if (rawTranscript && rawTranscript?.length > SUMMARY_MAX_CHARS) {
        showToast({
          style: Toast.Style.Animated,
          title: "❗",
          message: "That's a long video, hold on.",
        });

        const transcriptionSummary = rawTranscript?.split(/(?<=\.)/).reduce(
          (acc, curr) => {
            if (acc[acc.length - 1].length + curr.length > SUMMARY_MAX_CHARS) {
              const splitTranscription = curr.match(new RegExp(`.{1,${SUMMARY_MAX_CHARS}}`, "g"));
              console.log("splitTranscription", splitTranscription);
              splitTranscription?.forEach((split) => {
                acc.push(split);
              });
            } else {
              acc[acc.length - 1] += curr;
            }
            return acc;
          },
          [""]
        );

        for (const summaryBlock of transcriptionSummary) {
          const index = transcriptionSummary.indexOf(summaryBlock) + 1;
          const openAiInstructionBlock = `
          Summarize this transcription of a youtube video.
          The transcription is split into parts and this is part ${index} of ${transcriptionSummary.length}.
          Be as concise as possible.
          Do not use more then ${SUMMARY_MAX_CHARS / transcriptionSummary.length} characters.

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
        rawTranscript &&
        `Summarize the following transcription of a youtube video as a list of the most important points each starting with a fitting emoji. Ignore mentions of video sponsors.

        Format:
        [Emoji] [List Item] \n

        Here is the transcript: ${temporarySummary.length > 0 ? temporarySummary : rawTranscript}`;

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
      execute: Boolean(rawTranscript),
    }
  );

  return { summaryIsLoading: transcriptLoading || isLoading, summary };
}
