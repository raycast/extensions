import { Action, ActionPanel, Detail, Icon, Toast, showToast } from "@raycast/api";
import { Stream } from "openai/streaming";
import { useEffect, useState } from "react";
import { ContentFormat, ResultViewProps } from "./ResultView.types";
import { enable_streaming, global_model, isPerplexityAPI, openai } from "../lib/api";
import { allModels as changeModels, countToken, estimatePrice, getBrowserContent } from "../lib/utils";

export function ResultView(props: ResultViewProps) {
  const { sys_prompt, model_override, toast_title, temperature } = props;
  const [response_token_count, setResponseTokenCount] = useState(0);
  const [prompt_token_count, setPromptTokenCount] = useState(0);
  const [response, setResponse] = useState("");
  const [browserContent, setBrowserContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [cumulative_tokens, setCumulativeTokens] = useState(0);
  const [cumulative_cost, setCumulativeCost] = useState(0);
  const [model, setModel] = useState(model_override == "global" ? global_model : model_override);
  const [temp, setTemperature] = useState(temperature ? temperature : 1);

  async function getChatResponse(prompt: string, model: string, temp: number, format?: ContentFormat) {
    try {
      const _browserContent = await getBrowserContent({ format });
      setBrowserContent(_browserContent);

      const streamOrCompletion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "system",
            content: `${prompt}`,
          },
          { role: "user", content: "\nTranscript:  " + _browserContent },
        ],
        temperature: temp,
        stream: enable_streaming,
      });
      setPromptTokenCount(countToken(prompt + _browserContent));
      return streamOrCompletion;
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

    const resp = await getChatResponse(sys_prompt, newModel ?? model, newTemp ?? temp);
    if (!resp) return;

    let response_ = "";
    function appendResponse(part: string) {
      response_ += part;
      setResponse(response_);
      setResponseTokenCount(countToken(response_));
    }

    if (resp instanceof Stream) {
      for await (const part of resp) {
        appendResponse(part.choices[0]?.delta?.content ?? "");
      }
    } else {
      appendResponse(resp.choices[0]?.message?.content ?? "");
    }

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
      setCumulativeCost(cumulative_cost + estimatePrice(prompt_token_count, response_token_count, model));
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
            <Action.CopyToClipboard title="Copy Browser Content" content={browserContent} />
            <Action
              title="Retry"
              onAction={() => retry({})}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              icon={Icon.Repeat}
            />
            {isPerplexityAPI && (
              <ActionPanel.Submenu
                title="Retry with Another Model"
                icon={Icon.ArrowNe}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              >
                {changeModels
                  .filter((newModel) => newModel.id !== model && newModel.id !== "global")
                  .map((newModel) => (
                    <Action
                      key={newModel.id}
                      icon={{ source: Icon.ChevronRight }}
                      title={`${newModel.name}`}
                      onAction={() => retry({ newModel: newModel.id })}
                    />
                  ))}
              </ActionPanel.Submenu>
            )}
            <ActionPanel.Submenu
              title="Change Temperature"
              icon={Icon.Temperature}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            >
              <Action icon={{ source: Icon.Signal1 }} title="0.2" onAction={() => retry({ newTemp: 0.2 })} />
              <Action icon={{ source: Icon.Signal2 }} title="0.6" onAction={() => retry({ newTemp: 0.6 })} />
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
          {isPerplexityAPI && (
            <Detail.Metadata.Label
              title="Total Cost"
              text={estimatePrice(prompt_token_count, response_token_count, model).toString() + " ¢"}
            />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Culmulative Tokens" text={cumulative_tokens.toString()} />
          {isPerplexityAPI && (
            <Detail.Metadata.Label title="Culmulative Cost" text={cumulative_cost.toFixed(4) + " ¢"} />
          )}
        </Detail.Metadata>
      }
    />
  );
}
