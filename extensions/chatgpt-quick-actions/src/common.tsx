import {
  getSelectedText,
  Detail,
  getPreferenceValues,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { model, openai } from "./api";
import { countToken, estimatePrice, sentToSideNote } from "./util";

export default function ResultView(prompt: string, toast_title: string) {
  const pref = getPreferenceValues();
  const [response_token_count, setResponseTokenCount] = useState(0);
  const [prompt_token_count, setPromptTokenCount] = useState(0);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(true);
  let response_ = "";
  const [cumulative_tokens, setCumulativeTokens] = useState(0);
  const [cumulative_cost, setCumulativeCost] = useState(0);
  const [model_override, setModelOverride] = useState(model);

  async function getResult() {
    const now = new Date();
    let duration = 0;

    async function getStream(prompt: string) {
      const selectedText = await getSelectedText();
      const stream = await openai.createChatCompletion(
        {
          model: model_override,
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: selectedText }
          ],
          stream: true,
        },
        { responseType: "stream" }
      );
      setPromptTokenCount(countToken(prompt + selectedText));
      return stream;
    }

    getStream(prompt).then(async (stream) => {
      const toast = await showToast(Toast.Style.Animated, toast_title);
      (stream.data as any).on("data", (data: any) => {
        const lines = data
          .toString()
          .split("\n")
          .filter((line: string) => line.trim() !== "");
        for (const line of lines) {
          const message = line.replace(/^data: /, "");
          if (message === "[DONE]") {
            setLoading(false);
            const done = new Date();
            duration = (done.getTime() - now.getTime()) / 1000;
            toast.style = Toast.Style.Success;
            toast.title = `Finished in ${duration} seconds`;
            return; // Stream finished
          }
          try {
            const parsed = JSON.parse(message);
            const content = parsed.choices[0].delta.content;
            if (content) response_ += parsed.choices[0].delta.content;
            setResponse(response_);
            setResponseTokenCount(countToken(response_));
          } catch (error) {
            console.error("Could not JSON parse stream message", message, error);
          }
        }
      });
    });
  }

  async function retry() {
    setLoading(true);
    setResponse("");
    getResult();
  }

  async function retryWithGPT4() {
    setModelOverride("gpt-4");
    setLoading(true);
    setResponse("");
    getResult();
  }

  useEffect(() => {
    getResult();
  }, []);

  useEffect(() => {
    if (loading == false) {
      setCumulativeTokens(cumulative_tokens + prompt_token_count + response_token_count);
      setCumulativeCost(cumulative_cost + estimatePrice(prompt_token_count, response_token_count, model_override));
    }
      
  }, [loading]);

  let sidenote = undefined;
  if (pref.sidenote) {
    sidenote = (
      <Action
        title="Send to SideNote"
        onAction={async () => {
          await sentToSideNote(response);
        }}
        shortcut={{ modifiers: ["cmd"], key: "s" }}
        icon={Icon.Sidebar}
      />
    );
  }

  return (
    <Detail
      markdown={response}
      isLoading={loading}
      actions={
        <ActionPanel title="Actions">
          <Action.CopyToClipboard title="Copy Results" content={response} />
          <Action.Paste title="Paste Results" content={response} />
          <Action title="Retry" onAction={retry} shortcut={{ modifiers: ["cmd"], key: "r" }} icon={Icon.Repeat} />
          {(
            model_override != "gpt-4" && <Action title="Retry with GPT-4" onAction={retryWithGPT4} shortcut={{ modifiers: ["cmd", "shift"], key: "r" }} icon={Icon.ArrowNe} />
          )}
          {sidenote}
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Current Model" text={model_override} />
          <Detail.Metadata.Label title="Prompt Tokens" text={prompt_token_count.toString()} />
          <Detail.Metadata.Label title="Response Tokens" text={response_token_count.toString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Total Tokens" text={(prompt_token_count + response_token_count).toString()} />
          <Detail.Metadata.Label
            title="Total Cost"
            text={estimatePrice(prompt_token_count, response_token_count, model_override).toString() + " cents"}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Culmulative Tokens" text={cumulative_tokens.toString()} />
          <Detail.Metadata.Label
            title="Culmulative Cost"
            text={cumulative_cost.toString() + " cents"}
          />
        </Detail.Metadata>
      }
    />
  );
}
