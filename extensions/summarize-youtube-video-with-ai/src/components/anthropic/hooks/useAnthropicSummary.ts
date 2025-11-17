import Anthropic from "@anthropic-ai/sdk";
import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useEffect } from "react";
import { ANTHROPIC_MODEL } from "../../../const/defaults";
import { ALERT, SUCCESS_SUMMARIZING_VIDEO, SUMMARIZING_VIDEO } from "../../../const/toast_messages";
import type { AnthropicPreferences } from "../../../summarizeVideoWithAnthropic";
import { getAiInstructionSnippet } from "../../../utils/getAiInstructionSnippets";

type GetAnthropicSummaryProps = {
  transcript?: string;
  setSummaryIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSummary: React.Dispatch<React.SetStateAction<string | undefined>>;
};

export const useAnthropicSummary = async ({
  transcript,
  setSummaryIsLoading,
  setSummary,
}: GetAnthropicSummaryProps) => {
  const abortController = new AbortController();
  const preferences = getPreferenceValues() as AnthropicPreferences;
  const { anthropicApiToken, language, anthropicModel, creativity } = preferences;

  if (anthropicApiToken === "") {
    showToast({
      title: ALERT.title,
      message:
        "Anthropic Developer Account is required for this extension to work. You need to add your API key in preferences.",
      style: Toast.Style.Failure,
    });
    return;
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: `abortController ` in dependencies will lead to an error
  useEffect(() => {
    if (!transcript) return;

    const anthropic = new Anthropic({
      apiKey: anthropicApiToken,
    });

    setSummaryIsLoading(true);

    const aiInstructions = getAiInstructionSnippet(language, transcript, transcript);

    showToast({
      style: Toast.Style.Animated,
      title: SUMMARIZING_VIDEO.title,
      message: SUMMARIZING_VIDEO.message,
    });

    const stream = anthropic.messages.stream(
      {
        model: anthropicModel || ANTHROPIC_MODEL,
        max_tokens: 8192,
        stream: true,
        messages: [{ role: "user", content: aiInstructions }],
        temperature: Number.parseInt(creativity),
      },
      { signal: abortController.signal },
    );

    stream.on("text", (delta) => {
      setSummary((result) => {
        if (result === undefined) return delta || undefined;
        return result + delta || result;
      });
    });

    stream.finalMessage().then(() => {
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
  }, [transcript, anthropicApiToken, anthropicModel, creativity, language, setSummary, setSummaryIsLoading]);
};
