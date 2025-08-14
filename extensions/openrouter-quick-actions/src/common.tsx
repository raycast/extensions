import { getSelectedText, Detail, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { getCompletionMetadata, openai } from "./api";
import { ChatCompletionChunk } from "openai/resources";
import { Stream } from "openai/streaming";
import { APIPromise } from "openai";
import { formatCurrency, getModelName } from "./util";

interface ResultViewConfig {
  prompt: string;
  model_override: string;
  provider_sort?: string;
  toast_title: string;
}

export default function ResultView(config: ResultViewConfig) {
  const { prompt, model_override, provider_sort, toast_title } = config;
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(true);
  const [cost, setCost] = useState(0);
  const [lastRequestMetadata, setLastRequestMetadata] = useState<{
    provider: string;
    total_cost: number;
    model: string;
    latencyMs: number;
    durationS: string;
  } | null>(null);
  const [cumulativeCost, setCumulativeCost] = useState(0);
  const [model] = useState(getModelName(model_override));

  async function getResult() {
    const now = new Date();
    let duration = 0;
    let toast = undefined;
    if (toast_title && toast_title !== "") {
      toast = await showToast(Toast.Style.Animated, toast_title);
    }
    let selectedText = "";

    try {
      selectedText = await getSelectedText();
    } catch (error) {
      console.error(error);
      if (toast) {
        toast.title = "Error";
        toast.style = Toast.Style.Failure;
      }
      setLoading(false);
      setResponse(
        "⚠️ Raycast was unable to get the selected text. You may try copying the text to a text editor and try again.",
      );
      return;
    }

    try {
      const stream = await (openai.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: selectedText },
        ],
        provider: {
          sort: provider_sort == "global" ? undefined : provider_sort,
        },
        stream: true,
        usage: {
          include: true,
        },
      } as never) as unknown as APIPromise<Stream<ChatCompletionChunk>>);
      if (!stream) return;

      let response_ = "";
      for await (const part of stream) {
        if (part.usage) {
          console.log(part.usage);
        }
        const message = part.choices[0].delta.content;
        if (message) {
          response_ += message;
          setResponse(response_);
        }
        if (part.choices[0].finish_reason === "stop") {
          setTimeout(async () => {
            const metadata = await getCompletionMetadata(part.id);
            if (metadata) {
              setLastRequestMetadata({
                provider: metadata.provider_name,
                total_cost: metadata.total_cost,
                model: model,
                latencyMs: metadata.latency,
                durationS: (metadata.generation_time / 1000).toFixed(2),
              });
              setCost(metadata.total_cost);
            }
          }, 1000);
          setLoading(false);
          const done = new Date();
          duration = (done.getTime() - now.getTime()) / 1000;
          if (toast) {
            toast.style = Toast.Style.Success;
            toast.title = `Finished in ${duration} seconds`;
          }
          break; // Stream finished
        }
      }
    } catch (error) {
      if (toast) {
        toast.title = "Error";
        toast.style = Toast.Style.Failure;
      }
      setLoading(false);
      setResponse(
        `⚠️ Failed to get response from OpenRouter. Please check your network connection and API key. \n\n Error Message: \`\`\`${
          (error as Error).message
        }\`\`\``,
      );
      return;
    }
  }

  async function retry() {
    setLoading(true);
    setCumulativeCost(0);
    setResponse("");
    getResult();
  }

  useEffect(() => {
    getResult();
  }, []);

  useEffect(() => {
    setCumulativeCost((oldCost) => oldCost + cost);
  }, [cost]);

  return (
    <Detail
      markdown={response}
      isLoading={loading}
      actions={
        !loading ? (
          <ActionPanel title="Actions">
            <Action.CopyToClipboard title="Copy Results" content={response} />
            <Action.Paste title="Paste Results" content={response} />
            <Action title="Retry" onAction={retry} shortcut={{ modifiers: ["cmd"], key: "r" }} icon={Icon.Repeat} />
          </ActionPanel>
        ) : null
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Current Model" text={model} />

          {cumulativeCost > 0 && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Total Cost" text={formatCurrency(cumulativeCost)} />
            </>
          )}

          {lastRequestMetadata && (
            <>
              <Detail.Metadata.Label title="Request cost" text={formatCurrency(lastRequestMetadata.total_cost)} />
              <Detail.Metadata.TagList title="Provider">
                <Detail.Metadata.TagList.Item text={lastRequestMetadata.provider} />
              </Detail.Metadata.TagList>
              <Detail.Metadata.Label title="Latency" text={lastRequestMetadata.latencyMs.toString() + " ms"} />
              <Detail.Metadata.Label title="Duration" text={lastRequestMetadata.durationS + " s"} />
            </>
          )}
          <Detail.Metadata.Separator />
        </Detail.Metadata>
      }
    />
  );
}
