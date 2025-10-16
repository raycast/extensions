import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import OpenAI from "openai";
import { useEffect } from "react";
import { OPENAI_MODEL } from "../../../const/defaults";
import { ALERT, SUCCESS_SUMMARIZING_VIDEO, SUMMARIZING_VIDEO } from "../../../const/toast_messages";
import type { OpenAIPreferences } from "../../../summarizeVideoWithOpenAI";
import { getAiInstructionSnippet } from "../../../utils/getAiInstructionSnippets";

type GetOpenAISummaryProps = {
  transcript?: string;
  setSummaryIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSummary: React.Dispatch<React.SetStateAction<string | undefined>>;
};

export const useOpenAISummary = ({ transcript, setSummaryIsLoading, setSummary }: GetOpenAISummaryProps) => {
  const abortController = new AbortController();
  const preferences = getPreferenceValues() as OpenAIPreferences;
  const { creativity, openaiApiToken, language, openaiEndpoint, openaiModel } = preferences;

  if (openaiApiToken === "") {
    showToast({
      title: ALERT.title,
      message: "OpenAI API key is empty. You need to add your API key in preferences.",
      style: Toast.Style.Failure,
    });
    return;
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: `abortController ` in dependencies will lead to an error
  useEffect(() => {
    if (!transcript) return;

    const aiInstructions = getAiInstructionSnippet(language, transcript, transcript);

    const openai = new OpenAI({
      apiKey: openaiApiToken,
    });

    if (openaiEndpoint !== "") {
      openai.baseURL = openaiEndpoint;
    }

    setSummaryIsLoading(true);

    showToast({
      style: Toast.Style.Animated,
      title: SUMMARIZING_VIDEO.title,
      message: SUMMARIZING_VIDEO.message,
    });

    const stream = openai.chat.completions.stream({
      model: openaiModel || OPENAI_MODEL,
      temperature: Number.parseInt(creativity),
      messages: [{ role: "user", content: aiInstructions }],
      stream: true,
    });

    stream.on("content", (delta) => {
      setSummary((result) => {
        if (result === undefined) return delta || undefined;
        return result + delta || result;
      });
    });

    stream.finalChatCompletion().then(() => {
      setSummaryIsLoading(false);
      showToast({
        style: Toast.Style.Success,
        title: SUCCESS_SUMMARIZING_VIDEO.title,
        message: SUCCESS_SUMMARIZING_VIDEO.message,
      });
    });

    stream.on("error", (error) => {
      if (abortController.signal.aborted) return;
      setSummaryIsLoading(false);
      showToast({
        style: Toast.Style.Failure,
        title: ALERT.title,
        message: error.message,
      });
    });

    return () => {
      abortController.abort();
    };
  }, [creativity, language, openaiApiToken, openaiEndpoint, openaiModel, setSummary, setSummaryIsLoading, transcript]);
};
