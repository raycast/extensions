import { CHATGPT_SUMMARY_MAX_CHARS } from "../const/max_chars";
import { Configuration, OpenAIApi } from "openai";
import { PreferenceValues } from "../summarizeVideo";
import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import {
  ERROR_SUMMARIZING_VIDEO,
  LONG_VIDEO,
  SUCCESS_SUMMARIZING_VIDEO,
  SUMMARIZING_VIDEO,
} from "../const/toast_messages";
import React from "react";
import splitTranscript from "../utils/splitTranscript";
import { getAiInstructionSnippet, getSummaryBlockSnippet } from "../utils/getAiInstructionSnippets";

type GetChatGPTSummaryProps = {
  transcript?: string;
  setSummaryIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSummary: React.Dispatch<React.SetStateAction<string | undefined>>;
};

const useChatGPTSummary = async ({ transcript, setSummaryIsLoading, setSummary }: GetChatGPTSummaryProps) => {
  const preferences = getPreferenceValues() as PreferenceValues;
  const { chosenAi, creativity, openaiApiToken, language } = preferences;

  if (chosenAi !== "chatgpt") {
    return;
  }

  const configuration = new Configuration({
    apiKey: openaiApiToken,
  });
  const openai = new OpenAIApi(configuration);
  let temporarySummary = "";

  setSummaryIsLoading(true);

  if (transcript && transcript?.length > CHATGPT_SUMMARY_MAX_CHARS) {
    showToast({
      style: Toast.Style.Animated,
      title: LONG_VIDEO.title,
      message: LONG_VIDEO.message,
    });

    const splitTranscripts = splitTranscript(transcript, CHATGPT_SUMMARY_MAX_CHARS);

    for (const summaryBlock of splitTranscripts) {
      const index = splitTranscripts.indexOf(summaryBlock) + 1;
      const aiInstructions = getSummaryBlockSnippet(
        index,
        splitTranscripts.length,
        summaryBlock,
        CHATGPT_SUMMARY_MAX_CHARS
      );

      try {
        const result = await openai.createChatCompletion({
          model: "gpt-3.5-turbo",
          temperature: parseInt(creativity),
          messages: [{ role: "user", content: aiInstructions }],
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

  const aiInstructions = getAiInstructionSnippet(language, temporarySummary, transcript);

  try {
    showToast({
      style: Toast.Style.Animated,
      title: SUMMARIZING_VIDEO.title,
      message: SUMMARIZING_VIDEO.message,
    });

    const result = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      temperature: parseInt(creativity),
      messages: [{ role: "user", content: aiInstructions }],
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
