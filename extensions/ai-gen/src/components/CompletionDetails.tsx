import { useEffect, useState } from "react";

import { Action, ActionPanel, Detail, Icon, Toast, getPreferenceValues, showToast, useNavigation } from "@raycast/api";

import { CompleteTextForm } from "./CompleteTextForm";
import useOpenAICompletionApi from "../hooks/useOpenAICompletionApi";

export interface CompletionDetailProps {
  prompt: string;
  showAdvanced: boolean;
  model: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
}

export default function CompletionDetails(props: CompletionDetailProps) {
  const { prompt, showAdvanced, model, temperature, max_tokens, top_p, frequency_penalty, presence_penalty } = props;

  const { apiKey } = getPreferenceValues();
  const [completion, createCompletion, , , isLoading] = useOpenAICompletionApi({ apiKey });

  const promptHeaderStr = "**Prompt**\n\n" + prompt + "\n\n---\n**Result**\n\n";
  const [markdown, setMarkdown] = useState(promptHeaderStr + "*Loading*...");

  const { push } = useNavigation();

  function editRequestAction() {
    push(
      <CompleteTextForm
        draftValues={{
          prompt,
          showAdvanced,
          model,
          temperature: temperature.toString(),
          max_tokens: max_tokens.toString(),
          top_p: top_p.toString(),
          frequency_penalty: frequency_penalty.toString(),
          presence_penalty: presence_penalty.toString(),
        }}
      />
    );
  }

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

      setMarkdown(promptHeaderStr + "Uh oh, something went wrong!");
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
      actions={
        <ActionPanel>
          {completion.choices?.[0] ? (
            <Action.CopyToClipboard title="Copy Result" content={completion.choices?.[0]?.text ?? ""} />
          ) : null}
          <Action title="Edit Request" icon={Icon.Pencil} onAction={editRequestAction} />
        </ActionPanel>
      }
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
