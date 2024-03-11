import { getSelectedText, Detail, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { global_model, enable_streaming, anthropic } from "./api";
import Anthropic from '@anthropic-ai/sdk'
import { currentDate, countToken } from "./utils";
import { ResultViewProps } from "./ResultView.types";

export default function ResultView(props: ResultViewProps) {
  const { sys_prompt, selected_text, user_extra_msg, model_override, toast_title, temperature } = props;
  const [response_token_count, setResponseTokenCount] = useState(0);
  const [prompt_token_count, setPromptTokenCount] = useState(0);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(true);
  const [cumulative_tokens, setCumulativeTokens] = useState(0);
  const [model, setModel] = useState(model_override == "" ? global_model : model_override);
  const [temp, setTemperature] = useState(temperature ? temperature : 1);

  async function getChatResponse(prompt: string, selectedText: string, model: string, temp: number) {
    if (model.includes("online")) {
      prompt = `Current date: ${currentDate}.`;
    }
    try {
      const stream = anthropic.messages
        .stream({
          model: 'claude-3-opus-20240229',
          max_tokens: 4096,
          system: prompt,
          messages: [
            {
              role: "user",
              content: selectedText + (user_extra_msg ? `\n\n${user_extra_msg}` : ""),
            },
          ],
        });

      setPromptTokenCount(countToken(prompt + selectedText));
      return stream;
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Error" });
      setLoading(false);
      setResponse(
        "## ⚠️ Issue when accessing the API. \n\n" + `Error Message: \n\n \`\`\`${(error as Error).message}\`\`\``,
      );
      return;
    }
  }

  async function getResult(newModel?: string, newTemp?: number) {
    const now = new Date();
    let duration = 0;
    const toast = await showToast(Toast.Style.Animated, toast_title);

    let selectedText = selected_text;
    if (selectedText === undefined) {
      try {
        selectedText = await getSelectedText();
      } catch (error) {
        console.log(error);
        await showToast({ style: Toast.Style.Failure, title: "Error" });
        setLoading(false);
        setResponse(
          "⚠️ Raycast was unable to get the selected text. You may try copying the text to a text editor and try again.",
        );
        return;
      }
    }

    const resp = await getChatResponse(sys_prompt, selectedText, newModel ?? model, newTemp ?? temp);
    if (!resp) return;

    let response_ = "";
    function appendResponse(part: string) {
      response_ += part;
      setResponse(response_);
      setResponseTokenCount(countToken(response_));
    }

    resp.on('text', (text) => {
      appendResponse(text);
    });

    setLoading(false);
    const done = new Date();
    duration = (done.getTime() - now.getTime()) / 1000;
    toast.style = Toast.Style.Success;
    toast.title = `Finished in ${duration} seconds`;
  }

  function retry(options: { newModel?: string; newTemp?: number }) {
    setLoading(true);
    setResponse("");
    if (options.newModel) setModel(options.newModel);
    if (options.newTemp) setTemperature(options.newTemp);
    getResult(options.newModel, options.newTemp);
  }

  useEffect(() => {
    getResult();
  }, []);

  useEffect(() => {
    if (loading == false) {
      setCumulativeTokens(cumulative_tokens + prompt_token_count + response_token_count);
    }
  }, [loading]);

  return (
    <Detail
      markdown={response}
      isLoading={loading}
      actions={
        !loading && (
          <ActionPanel title="Actions">
            <Action.CopyToClipboard title="Copy Results" content={response} />
            <Action.Paste title="Paste Results" content={response} />
            <Action
              title="Retry"
              onAction={() => retry({})}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              icon={Icon.Repeat}
            />
            <ActionPanel.Submenu
              title="Change Temperature"
              icon={Icon.Temperature}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            >
              <Action icon={{ source: Icon.Signal1 }} title="0.2" onAction={() => retry({ newTemp: 0.2 })} />
              <Action icon={{ source: Icon.Signal2 }} title="0.5" onAction={() => retry({ newTemp: 0.5 })} />
              <Action icon={{ source: Icon.Signal3 }} title="1.0" onAction={() => retry({ newTemp: 1.0 })} />
              <Action icon={{ source: Icon.FullSignal }} title="1.5" onAction={() => retry({ newTemp: 1.5 })} />
            </ActionPanel.Submenu>
          </ActionPanel>
        )
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Current Model" text={model} />
          <Detail.Metadata.Label title="Temperature" text={temp.toFixed(1)} />
          <Detail.Metadata.Label title="Prompt Tokens" text={prompt_token_count.toString()} />
          <Detail.Metadata.Label title="Response Tokens" text={response_token_count.toString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Total Tokens" text={(prompt_token_count + response_token_count).toString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Culmulative Tokens" text={cumulative_tokens.toString()} />
        </Detail.Metadata>
      }
    />
  );
}
