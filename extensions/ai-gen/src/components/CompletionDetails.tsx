import { useEffect, useState } from "react";

import { Detail, Toast, getPreferenceValues, showToast } from "@raycast/api";
import useOpenAICompletionApi from "../hooks/useOpenAICompletionApi";

export interface CompletionDetailProps {
  prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
}

export default function CompletionDetails(props: CompletionDetailProps) {
  const { prompt, model, temperature, max_tokens, top_p, frequency_penalty, presence_penalty } = props;

  const { apiKey } = getPreferenceValues();
  const [completion, createCompletion, , , isLoading] = useOpenAICompletionApi({ apiKey });

  const promptHeaderStr = "**Prompt**\n\n" + prompt + "\n\n---\n**Response**\n\n";
  const [markdown, setMarkdown] = useState(promptHeaderStr + "*Loading*...");

  useEffect(() => {
    createCompletion({ prompt, model, temperature, max_tokens, top_p, frequency_penalty, presence_penalty });
  }, []);

  useEffect(() => {
    if (completion?.error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed creating completion",
        message: completion?.error.message,
      });
    }
  }, [completion?.error]);

  useEffect(() => {
    if (completion?.choices?.length) {
      const [topChoice] = completion.choices;
      setMarkdown(promptHeaderStr + topChoice.text);
    }
  }, [completion?.choices]);

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Model" text={model} />
          <Detail.Metadata.Label title="Temperature" text={temperature.toString()} />
          <Detail.Metadata.Label title="Maximum" text={max_tokens.toString()} />
          <Detail.Metadata.Label title="Top P" text={top_p.toString()} />
          <Detail.Metadata.Label title="Frequency Penalty" text={frequency_penalty.toString()} />
          <Detail.Metadata.Label title="Presence Penalty" text={presence_penalty.toString()} />
        </Detail.Metadata>
      }
    />
  );
}
