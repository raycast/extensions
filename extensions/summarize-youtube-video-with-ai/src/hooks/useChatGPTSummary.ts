import React from "react";
import { CHATGPT_SUMMARY_MAX_CHARS } from "../const/max_chars";
import { Configuration, OpenAIApi } from "openai";
import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import splitTranscript from "../utils/splitTranscript";
import {
  ERROR_SUMMARIZING_VIDEO,
  LONG_VIDEO,
  SUCCESS_SUMMARIZING_VIDEO,
  SUMMARIZING_VIDEO,
} from "../const/toast_messages";

type GetChatGPTSummaryProps = {
  transcript?: string;
  setSummaryIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSummary: React.Dispatch<React.SetStateAction<string | undefined>>;
};

const useChatGPTSummary = async ({ transcript, setSummaryIsLoading, setSummary }: GetChatGPTSummaryProps) => {
  const preferences = getPreferenceValues();

  if (preferences.chosenAi !== "chatgpt") {
    return;
  }

  const configuration = new Configuration({
    apiKey: preferences.openaiApiToken,
  });
  const openai = new OpenAIApi(configuration);
  let temporarySummary = "";
  let openAiInstructions = "";

  setSummaryIsLoading(true);

  if (transcript && transcript?.length > CHATGPT_SUMMARY_MAX_CHARS) {
    showToast({
      style: Toast.Style.Animated,
      title: LONG_VIDEO.title,
      message: LONG_VIDEO.message,
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

      try {
        const result = await openai.createChatCompletion({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: openAiInstructionBlock }],
        });
        temporarySummary += result.data.choices[0].message?.content;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        showToast({
          style: Toast.Style.Failure,
          title: ERROR_SUMMARIZING_VIDEO.title,
          message: error.message,
        });
      }
    }
  }

  openAiInstructions +=
    transcript &&
    `Summarize the following transcription of a youtube video as a list of the most important points each starting with a fitting emoji. Ignore mentions of video sponsors. Answer in ${
      preferences.language
    }.

    Format:
    [Emoji] [List Item] [\n\n]
    Here is the transcript: ${temporarySummary.length > 0 ? temporarySummary : transcript}`;

  try {
    showToast({
      style: Toast.Style.Animated,
      title: SUMMARIZING_VIDEO.title,
      message: SUMMARIZING_VIDEO.message,
    });

    const result = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: openAiInstructions }],
    });
    showToast({
      style: Toast.Style.Success,
      title: SUCCESS_SUMMARIZING_VIDEO.title,
      message: SUCCESS_SUMMARIZING_VIDEO.message,
    });
    setSummary(result.data.choices[0].message?.content);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    showToast({
      style: Toast.Style.Failure,
      title: ERROR_SUMMARIZING_VIDEO.title,
      message: error.message,
    });
    console.error(error.request.res);
  }

  setSummaryIsLoading(false);
};

export default useChatGPTSummary;
