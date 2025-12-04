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
import { globalModel, openai } from "./api";
import { countToken, estimatePrice, sendToSideNote } from "./util";

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
  modelOverride: string,
  toastTitle: string,
  useSelectedText: boolean,
  userInput?: string
) {
  const pref = getPreferenceValues();
  const [responseTokenCount, setResponseTokenCount] = useState(0);
  const [promptTokenCount, setPromptTokenCount] = useState(0);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(true);
  const [cumulativeTokens, setCumulativeTokens] = useState(0);
  const [cumulativeCost, setCumulativeCost] = useState(0);
  const [model, setModel] = useState(modelOverride === "global" ? globalModel : modelOverride);

  async function getResult() {
    const now = new Date();
    let duration = 0;
    const toast = await showToast(Toast.Style.Animated, toastTitle);

    if (useSelectedText) {
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

    let userPrompt = "";
    if (userInput) {
      userPrompt = `USER PROMPT: ${userInput}`;
    }
    if (selectedText) {
      userPrompt += `\n\nUSER PROVIDED TEXT: ${selectedText}`;
    }

    console.log(`Prompt:\n ${userPrompt}`);

    try {
      const stream = await openai.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      });
      setPromptTokenCount(countToken(prompt + selectedText));

      if (!stream) return;

      let responseText = "";
      for await (const part of stream) {
        const message = part.choices[0].delta.content;
        if (message) {
          responseText += message;
          setResponse(responseText);
          setResponseTokenCount(countToken(responseText));
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
    if (loading === false && response && !response.startsWith("⚠️")) {
      setCumulativeTokens(cumulativeTokens + promptTokenCount + responseTokenCount);
      setCumulativeCost(cumulativeCost + estimatePrice(promptTokenCount, responseTokenCount, model));

      // Save to history
      const historyItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        prompt: prompt,
        user_input: userInput,
        selected_text: selectedText,
        response: response,
        model: model,
        promptTokens: promptTokenCount,
        responseTokens: responseTokenCount,
        cost: estimatePrice(promptTokenCount, responseTokenCount, model),
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
          await sendToSideNote(response);
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
          <Detail.Metadata.Label title="Prompt Tokens" text={promptTokenCount.toString()} />
          <Detail.Metadata.Label title="Response Tokens" text={responseTokenCount.toString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Total Tokens" text={(promptTokenCount + responseTokenCount).toString()} />
          <Detail.Metadata.Label
            title="Total Cost"
            text={`${estimatePrice(promptTokenCount, responseTokenCount, model).toString()} cents`}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Cumulative Tokens" text={cumulativeTokens.toString()} />
          <Detail.Metadata.Label title="Cumulative Cost" text={`${cumulativeCost.toString()} cents`} />
        </Detail.Metadata>
      }
    />
  );
}
