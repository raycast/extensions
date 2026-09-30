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
import { global_model, openai } from "./api";
import { countToken, estimatePrice, sentToSideNote } from "./util";

export default function ResultView(prompt: string, model_override: string, toast_title: string) {
  const pref = getPreferenceValues();
  const [response_token_count, setResponseTokenCount] = useState(0);
  const [prompt_token_count, setPromptTokenCount] = useState(0);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(true);
  const [cumulative_tokens, setCumulativeTokens] = useState(0);
  const [cumulative_cost, setCumulativeCost] = useState(0);
  const [model, setModel] = useState(model_override == "global" ? global_model : model_override);

  async function getResult() {
    const now = new Date();
    let duration = 0;
    const toast = await showToast(Toast.Style.Animated, toast_title);
    let selectedText = "";

    try {
      selectedText = await getSelectedText();
    } catch (error) {
      toast.title = "Error";
      toast.style = Toast.Style.Failure;
      setLoading(false);
      setResponse(
        "⚠️ Raycast was unable to get the selected text. You may try copying the text to a text editor and try again."
      );
      return;
    }

    try {
      const stream = await openai.chat.completions.create({
        model: model,
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
          break; // Stream finished
        }
      }
    } catch (error) {
      toast.title = "Error";
      toast.style = Toast.Style.Failure;
      setLoading(false);
      setResponse(
        `⚠️ Failed to get response from OpenAI. Please check your network connection and API key. \n\n Error Message: \`\`\`${
          (error as Error).message
        }\`\`\``
      );
      return;
    }
  }

  async function retry() {
    setLoading(true);
    setResponse("");
    getResult();
  }

  async function retryWithGPT4o() {
    setModel("gpt-4o");
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
      setCumulativeCost(cumulative_cost + estimatePrice(prompt_token_count, response_token_count, model));
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
        !loading && (
          <ActionPanel title="Actions">
            <Action.CopyToClipboard title="Copy Results" content={response} />
            <Action.Paste title="Paste Results" content={response} />
            <Action title="Retry" onAction={retry} shortcut={{ modifiers: ["cmd"], key: "r" }} icon={Icon.Repeat} />
            {model != "gpt-4o" && (
              <Action
                title="Retry with GPT-4o"
                onAction={retryWithGPT4o}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                icon={Icon.ArrowNe}
              />
            )}
            {sidenote}
          </ActionPanel>
        )
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Current Model" text={model} />
          <Detail.Metadata.Label title="Prompt Tokens" text={prompt_token_count.toString()} />
          <Detail.Metadata.Label title="Response Tokens" text={response_token_count.toString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Total Tokens" text={(prompt_token_count + response_token_count).toString()} />
          <Detail.Metadata.Label
            title="Total Cost"
            text={estimatePrice(prompt_token_count, response_token_count, model).toString() + " cents"}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Culmulative Tokens" text={cumulative_tokens.toString()} />
          <Detail.Metadata.Label title="Culmulative Cost" text={cumulative_cost.toString() + " cents"} />
        </Detail.Metadata>
      }
    />
  );
}
