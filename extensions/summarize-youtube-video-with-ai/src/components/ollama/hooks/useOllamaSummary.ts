import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import OpenAI from "openai";
import React, { useEffect } from "react";
import { OLLAMA_MODEL } from "../../../const/defaults";
import { ALERT, SUCCESS_SUMMARIZING_VIDEO, SUMMARIZING_VIDEO } from "../../../const/toast_messages";
import { OllamaPreferences } from "../../../summarizeVideoWithOllama";
import { getAiInstructionSnippet } from "../../../utils/getAiInstructionSnippets";

type GetOllamaSummaryProps = {
  transcript?: string;
  setSummaryIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSummary: React.Dispatch<React.SetStateAction<string | undefined>>;
};

export const useOllamaSummary = ({ transcript, setSummaryIsLoading, setSummary }: GetOllamaSummaryProps) => {
  const preferences = getPreferenceValues() as OllamaPreferences;
  const { creativity, language, ollamaEndpoint, ollamaModel } = preferences;

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

    const stream = openai.chat.completions.create({
      model: ollamaModel || OLLAMA_MODEL,
      temperature: parseFloat(creativity),
      messages: [{ role: "user", content: aiInstructions }],
      stream: true,
    });

    let content = "";

    stream
      .then(async (response) => {
        for await (const chunk of response) {
          const delta = chunk.choices[0]?.delta?.content || "";
          if (delta) {
            content += delta;
            setSummary(content);
          }
        }

        setSummaryIsLoading(false);
        showToast({
          style: Toast.Style.Success,
          title: SUCCESS_SUMMARIZING_VIDEO.title,
          message: SUCCESS_SUMMARIZING_VIDEO.message,
        });
      })
      .catch((error) => {
        setSummaryIsLoading(false);
        showToast({
          style: Toast.Style.Failure,
          title: ALERT.title,
          message: error.message,
        });
      });
  }, [transcript]);
};
