import { getSelectedText, Detail, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { global_model, enable_streaming, openai } from "./configAPI";
import { Stream } from "openai/streaming";
import { allModels as changeModels, currentDate, countToken, estimatePrice } from "./utils";
import { ResultViewProps } from "./ResultView.types";

export default function ResultView(props: ResultViewProps) {
  const { sys_prompt, selected_text, user_extra_msg, model_override, toast_title, temperature } = props;
  const [response_token_count, setResponseTokenCount] = useState(0);
  const [prompt_token_count, setPromptTokenCount] = useState(0);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(true);
  const [cumulative_tokens, setCumulativeTokens] = useState(0);
  const [cumulative_cost, setCumulativeCost] = useState(0);
  const [model, setModel] = useState(model_override == "global" ? global_model : model_override);
  const [temp, setTemperature] = useState(temperature ? temperature : 1);

  async function getChatResponse(sysPrompt: string, selectedText: string, model: string, temp: number) {
    sysPrompt = `Current date: ${currentDate}.\n\n ${sysPrompt}`;
    const userPrompt = `${user_extra_msg ? `${user_extra_msg.trim()}\n\n` : ""}${
      selectedText ? `The following is the text:\n"${selectedText.trim()}"` : ""
    }`;
    try {
      const streamOrCompletion = await openai.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: temp,
        stream: enable_streaming,
      });
      setPromptTokenCount(countToken(sysPrompt + selectedText));
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

  const formatUserMessage = (message: string): string => {
    return message
      .split("\n")
      .map((line) => `>${line}`)
      .join("\n");
  };

  return (
    <Detail
      markdown={`${user_extra_msg ? formatUserMessage(user_extra_msg) + "\n\n" : ""}${response}`}
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
            <ActionPanel.Submenu
              title="Change Temperature"
              icon={Icon.Temperature}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            >
              <Action icon={{ source: Icon.Signal1 }} title="0.2" onAction={() => retry({ newTemp: 0.2 })} />
              <Action icon={{ source: Icon.Signal1 }} title="0.4" onAction={() => retry({ newTemp: 0.4 })} />
              <Action icon={{ source: Icon.Signal2 }} title="0.6" onAction={() => retry({ newTemp: 0.6 })} />
              <Action icon={{ source: Icon.Signal2 }} title="0.8" onAction={() => retry({ newTemp: 0.8 })} />
              <Action icon={{ source: Icon.Signal3 }} title="1.0" onAction={() => retry({ newTemp: 1.0 })} />
              <Action icon={{ source: Icon.FullSignal }} title="1.2" onAction={() => retry({ newTemp: 1.2 })} />
              <Action icon={{ source: Icon.FullSignal }} title="1.4" onAction={() => retry({ newTemp: 1.4 })} />
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
          <Detail.Metadata.Label
            title="Total Cost"
            text={estimatePrice(prompt_token_count, response_token_count, model).toString() + " ¢"}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Culmulative Tokens" text={cumulative_tokens.toString()} />
          <Detail.Metadata.Label title="Culmulative Cost" text={cumulative_cost.toFixed(4) + " ¢"} />
        </Detail.Metadata>
      }
    />
  );
}
