import { Action, ActionPanel, Detail, Icon, Toast, showToast } from "@raycast/api";
import { Stream } from "openai/streaming";
import { useEffect, useState } from "react";
import { enable_streaming, global_model as model, openai, sys_prompt } from "../utils/api";
import { LoadFrom, loadFromClipboard, loadFromFinder } from "../utils/load";
import { ResultViewProps } from "./ResultView.types";

import { toUnit } from "../utils/to-unit";
import { countImageTokens, countToken, estimateImagePrice, estimatePrice } from "../utils/token";

function bufferToDataUrl(mimeType: string, buffer: Buffer) {
  const base64String = buffer.toString("base64");
  return `data:${mimeType};base64,${base64String}`;
}

export function ResultView(props: ResultViewProps) {
  const { user_prompt, toast_title, temperature, load } = props;
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(true);
  const [temp, setTemperature] = useState(temperature ? temperature : 1);

  const [imageMeta, setImageMeta] = useState<{ height: number; width: number; size: number }>({
    height: 0,
    width: 0,
    size: 0,
  });
  const [response_token_count, setResponseTokenCount] = useState(0);
  const [image_prompt_token_count, setImagePromptTokenCount] = useState(0);
  const [prompt_token_count, setPromptTokenCount] = useState(0);
  const [cumulative_tokens, setCumulativeTokens] = useState(0);
  const [cumulative_cost, setCumulativeCost] = useState(0);

  async function getChatResponse(prompt: string, model: string, temp: number) {
    try {
      let data: LoadFrom | undefined;

      if (load === "selected") {
        data = await loadFromFinder();
      } else {
        data = await loadFromClipboard();
      }

      let imageUrl = "";
      if (!data) {
        await showToast({ style: Toast.Style.Failure, title: "Error" });
        setLoading(false);
        setResponse("## ⚠️ No data found. Please try again.");
        return;
      }
      imageUrl = bufferToDataUrl(`image/${data.type}`, data.data);

      const streamOrCompletion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "system",
            content: `${sys_prompt}`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `${prompt ? prompt : "Describe this image:"}`,
              },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        temperature: temp,
        stream: enable_streaming,
      });

      const imageWidth = data.type.width;
      const imageHeight = data.type.height;
      setImageMeta({ height: imageHeight, width: imageWidth, size: data.data.length });
      setImagePromptTokenCount(countImageTokens(imageWidth, imageHeight));
      setPromptTokenCount(countToken(sys_prompt + prompt));
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

    const resp = await getChatResponse(user_prompt, newModel ?? model, newTemp ?? temp);
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
    if (options.newTemp) setTemperature(options.newTemp);
    getResult(options.newModel, options.newTemp);
  }

  useEffect(() => {
    getResult();
  }, []);

  useEffect(() => {
    if (loading == false) {
      setCumulativeTokens(cumulative_tokens + prompt_token_count + response_token_count + image_prompt_token_count);
      setCumulativeCost(
        cumulative_cost +
          estimatePrice(prompt_token_count, response_token_count, model) +
          estimateImagePrice(image_prompt_token_count),
      );
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
          {/* <Detail.Metadata.Label title="Prompt Tokens" text={prompt_token_count.toString()} />
          <Detail.Metadata.Label title="Response Tokens" text={response_token_count.toString()} /> */}
          <Detail.Metadata.Separator />
          {imageMeta.size && <Detail.Metadata.Label title="Size" text={toUnit(imageMeta.size)} />}
          {imageMeta.width && <Detail.Metadata.Label title="Width" text={String(imageMeta.width)} />}
          {imageMeta.height && <Detail.Metadata.Label title="Height" text={String(imageMeta.height)} />}
          {/* <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Total Tokens" text={(prompt_token_count + response_token_count).toString()} />
          <Detail.Metadata.Label
            title="Total Cost"
            text={estimatePrice(prompt_token_count, response_token_count, model).toString() + " ¢"}
          /> */}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Culmulative Tokens" text={cumulative_tokens.toString()} />
          <Detail.Metadata.Label title="Culmulative Cost" text={cumulative_cost.toFixed(4) + " ¢"} />
        </Detail.Metadata>
      }
    />
  );
}
