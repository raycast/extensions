import {
  Action,
  ActionPanel,
  Cache,
  Detail,
  getPreferenceValues,
  getSelectedText,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { global_model, openai } from "./api";
import { countToken, estimatePrice, sentToSideNote } from "./util";

// Define history item type
export interface HistoryItem {
  id: string;
  timestamp: number;
  prompt: string;
  user_input?: string;
  selected_text?: string;
  response: string;
  model: string;
  promptTokens: number;
  responseTokens: number;
  cost: number;
}

// Cache instance for history
const historyCache = new Cache();
const HISTORY_KEY = "deepseeker_history";
let selectedText = "";

// Function to save history
export function saveToHistory(item: HistoryItem): void {
  const history: HistoryItem[] = getHistory();
  history.unshift(item);

  // Limit history to 100 items to prevent excessive storage
  const limitedHistory = history.slice(0, 100);
  historyCache.set(HISTORY_KEY, JSON.stringify(limitedHistory));
}

// Function to get history
export function getHistory(): HistoryItem[] {
  const data = historyCache.get(HISTORY_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as HistoryItem[];
  } catch (e) {
    return [];
  }
}

export default function ResultView(
  prompt: string,
  model_override: string,
  toast_title: string,
  use_selected_text: boolean,
  user_input?: string
) {
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

    if (use_selected_text) {
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
    }

    let user_prompt = "";
    if (user_input) {
      user_prompt = "USER PROMPT: " + user_input;
    }
    if (selectedText) {
      user_prompt += "\n\nUSER PROVIDED TEXT: " + selectedText;
    }

    console.log("Prompt:\n " + user_prompt);

    try {
      const stream = await openai.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: user_prompt },
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
        `⚠️ Failed to get response from DeepSeek. Please check your network connection and API key. \n\n Error Message: \`\`\`${
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

  async function retryWithDeepSeekChat() {
    setModel("deepseek-chat");
    setLoading(true);
    setResponse("");
    getResult();
  }

  async function retryWithDeepSeekReasoner() {
    setModel("deepseek-reasoner");
    setLoading(true);
    setResponse("");
    getResult();
  }

  useEffect(() => {
    getResult();
  }, []);

  useEffect(() => {
    if (loading == false && response && !response.startsWith("⚠️")) {
      setCumulativeTokens(cumulative_tokens + prompt_token_count + response_token_count);
      setCumulativeCost(cumulative_cost + estimatePrice(prompt_token_count, response_token_count, model));

      // Save to history
      const historyItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        prompt: prompt,
        user_input: user_input,
        selected_text: selectedText,
        response: response,
        model: model,
        promptTokens: prompt_token_count,
        responseTokens: response_token_count,
        cost: estimatePrice(prompt_token_count, response_token_count, model),
      };
      saveToHistory(historyItem);
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
            {model != "deepseek-chat" && (
              <Action
                title="Retry with DeepSeek Chat"
                onAction={retryWithDeepSeekChat}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                icon={Icon.ArrowNe}
              />
            )}
            {model != "deepseek-reasoner" && (
              <Action
                title="Retry with DeepSeek Reasoner"
                onAction={retryWithDeepSeekReasoner}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
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
