import { Action, ActionPanel, Detail, getSelectedText, Icon, showToast, Toast } from "@raycast/api";
import { openai } from "./api";
import { countToken, estimatedPrice } from "./utils";
import { useEffect, useState } from "react";

export function ResultView(prompt: string, model: string, toastTitle: string) {
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(true);
  const [promptTokenCount, setPromptTokenCount] = useState(0);
  const [responseTokenCount, setResponseTokenCount] = useState(0);
  const [cumulativeTokens, setCumulativeTokens] = useState(0);
  const [cumulativeCost, setCumulativeCost] = useState(0);

  async function getResult() {
    const now = new Date();
    let duration = 0;
    const toast = await showToast(Toast.Style.Animated, toastTitle);
    let selectedText = "";

    try {
      selectedText = await getSelectedText();
    } catch (error) {
      toast.title = "Error";
      toast.style = Toast.Style.Failure;
      setLoading(false);
      setResponse(
        "⚠️ Raycast was unable to get the selected text. You may try copying the text to a text editor and try again.",
      );
      return;
    }

    try {
      const stream = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: selectedText },
        ],
        stream: true,
      });
      setPromptTokenCount(countToken(prompt + selectedText));

      if (!stream) return;

      let response_ = "";
      for await (const part of stream) {
        const message = part.choices[0].delta.content;
        if (message) {
          response_ += message;
          setResponse(response_);
          setResponseTokenCount(countToken(response_));
        }
        if (part.choices[0].finish_reason === "stop") {
          setLoading(false);
          const done = new Date();
          duration = (done.getTime() - now.getTime()) / 1000;
          toast.style = Toast.Style.Success;
          toast.title = `Finished in ${duration} seconds`;
          break;
        }
      }
    } catch (error) {
      toast.title = "Error";
      toast.style = Toast.Style.Failure;
      setLoading(false);
      setResponse(
        `⚠️ Failed to get response from OpenAI. Please check your network connection and API key. \n\n Error Message: \`\`\`${
          (error as Error).message
        }\`\`\``,
      );
      return;
    }
  }

  async function retry() {
    setLoading(true);
    setResponse("");
    getResult();
  }

  useEffect(() => {
    getResult();
  }, []);

  useEffect(() => {
    if (!loading) {
      setCumulativeTokens(cumulativeTokens + promptTokenCount + responseTokenCount);
      setCumulativeCost(cumulativeCost + estimatedPrice(promptTokenCount, responseTokenCount, model));
    }
  }, [loading]);

  return (
    <Detail
      markdown={response}
      isLoading={loading}
      actions={
        !loading && (
          <ActionPanel title="Actions">
            <Action.CopyToClipboard title="Copy Result" content={response} />
            <Action.Paste title="Paste Result" content={response} />
            <Action title="Retry" onAction={retry} shortcut={{ modifiers: ["cmd"], key: "r" }} icon={Icon.Repeat} />
          </ActionPanel>
        )
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Current Model" text={model} />
          <Detail.Metadata.Label title="Prompt Tokens" text={`${promptTokenCount}`} />
          <Detail.Metadata.Label title="Response Tokens" text={`${responseTokenCount}`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Total Tokens" text={`${promptTokenCount + responseTokenCount}`} />
          <Detail.Metadata.Label
            title="Total Cost"
            text={`${estimatedPrice(promptTokenCount, responseTokenCount, model)} cents`}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Cumulative Tokens" text={`${cumulativeTokens}`} />
          <Detail.Metadata.Label title="Cumulative Cost" text={`${cumulativeCost} cents`} />
        </Detail.Metadata>
      }
    />
  );
}
