import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import OpenAI from "openai";
import { useEffect } from "react";
import { OLLAMA_MODEL } from "../../../const/defaults";
import { ALERT, SUCCESS_SUMMARIZING_VIDEO, SUMMARIZING_VIDEO } from "../../../const/toast_messages";
import type { OllamaPreferences } from "../../../summarizeVideoWithOllama";
import { getAiInstructionSnippet } from "../../../utils/getAiInstructionSnippets";

type GetOllamaSummaryProps = {
  transcript?: string;
  setSummaryIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSummary: React.Dispatch<React.SetStateAction<string | undefined>>;
};

export const useOllamaSummary = ({ transcript, setSummaryIsLoading, setSummary }: GetOllamaSummaryProps) => {
  const abortController = new AbortController();
  const preferences = getPreferenceValues() as OllamaPreferences;
  const { creativity, language, ollamaEndpoint, ollamaModel } = preferences;

  // biome-ignore lint/correctness/useExhaustiveDependencies: `abortController ` in dependencies will lead to an error
  useEffect(() => {
    if (!transcript) return;

    const aiInstructions = getAiInstructionSnippet(language, transcript, transcript);

    const openai = new OpenAI({
      baseURL: ollamaEndpoint,
      apiKey: "ollama", // required but unused by Ollama
    });

    setSummaryIsLoading(true);

    showToast({
      style: Toast.Style.Animated,
      title: SUMMARIZING_VIDEO.title,
      message: SUMMARIZING_VIDEO.message,
    });

    const stream = openai.chat.completions.stream({
      model: ollamaModel || OLLAMA_MODEL,
      temperature: Number.parseFloat(creativity),
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
  }, [transcript, creativity, language, ollamaEndpoint, ollamaModel, setSummary, setSummaryIsLoading]);
};
