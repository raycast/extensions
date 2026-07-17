/* eslint-disable @typescript-eslint/no-explicit-any */

import { clearSearchBar, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCallback, useMemo, useRef, useState } from "react";
import say from "say";
import { v4 as uuidv4 } from "uuid";
import { Chat, ChatHook, Model } from "../type";
import { useAutoTTS } from "./useAutoTTS";
import { useHistory } from "./useHistory";
import { DEFAULT_MODEL } from "./useModel";

// Debug logging utility
function debugLog<T>(message: string, data?: T) {
  console.log(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : "");
}

async function callGrokAPI(
  params: { model: string; messages: string[]; stream: boolean },
  options: { signal: AbortSignal },
) {
  const apiKey = getPreferenceValues<{ apiKey: string }>().apiKey;
  if (!apiKey) {
    debugLog("API key missing");
    throw new Error("Grok API key is missing in preferences");
  }

  const endpoint = "https://api.x.ai/v1/chat/completions";
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  const body = JSON.stringify(params);

  debugLog("API Request", { endpoint, headers: { ...headers, Authorization: "[REDACTED]" }, body });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body,
      signal: options.signal,
    });

    debugLog("API Response Status", { status: response.status, statusText: response.statusText });

    if (!response.ok) {
      const errorText = await response.text();
      debugLog("API Error Response", { errorText });
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    if (!params.stream) {
      const json = await response.json();
      debugLog("API Non-Streaming Response", json);
      return json;
    }

    debugLog("Starting streaming response");
    return {
      async *[Symbol.asyncIterator]() {
        const reader = response.body?.getReader();
        if (!reader) {
          debugLog("No stream reader available");
          return;
        }
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            debugLog("Stream ended");
            break;
          }
          buffer += new TextDecoder().decode(value);
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.trim()) {
              try {
                // Strip 'data: ' prefix for SSE
                if (line.startsWith("data: ")) {
                  const jsonStr = line.slice(6); // Remove 'data: '
                  if (jsonStr === "[DONE]") {
                    debugLog("Stream termination signal received");
                    return;
                  }
                  const parsed = JSON.parse(jsonStr);
                  debugLog("Stream Chunk", parsed);
                  yield parsed;
                } else {
                  debugLog("Skipping non-data line", { line });
                }
              } catch (e) {
                debugLog("Failed to parse stream chunk", { line, error: String(e) });
              }
            }
          }
        }
      },
    };
  } catch (error) {
    debugLog("API Call Failed", { error: String(error), stack: error instanceof Error ? error.stack : undefined });
    throw error;
  }
}

export function useChat<T extends Chat>(props: T[]): ChatHook {
  const [data, setData] = useState<Chat[]>(props);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [isAborted, setIsAborted] = useState<boolean>(false);
  const [useStream] = useState<boolean>(() => {
    const streamPref = getPreferenceValues<{ useStream: boolean }>().useStream;
    debugLog("Stream Preference", { useStream: streamPref });
    return streamPref;
  });
  const [streamData, setStreamData] = useState<Chat | undefined>();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [isHistoryPaused] = useState<boolean>(() => {
    const paused = getPreferenceValues<{ isHistoryPaused: boolean }>().isHistoryPaused;
    debugLog("History Paused Preference", { isHistoryPaused: paused });
    return paused;
  });

  const history = useHistory();
  const isAutoTTS = useAutoTTS();

  async function ask(question: string, model: Model) {
    debugLog("Ask Called", { question, modelId: model.id, modelOption: model.option });

    clearSearchBar();
    setLoading(true);
    await showToast({
      title: "Getting Grok's answer...",
      style: Toast.Style.Animated,
    });

    let chat: Chat = {
      id: uuidv4(),
      question,
      answer: "",
      created_at: new Date().toISOString(),
      files: [],
    };

    setData((prev) => {
      debugLog("Updating chat data", { newChatId: chat.id });
      return [...prev, chat];
    });

    setTimeout(() => {
      setSelectedChatId(chat.id);
      debugLog("Selected chat ID", { selectedChatId: chat.id });
    }, 50);

    abortControllerRef.current = new AbortController();
    const { signal: abortSignal } = abortControllerRef.current;

    try {
      const messages = [
        ...(model.prompt ? [{ role: "system", content: model.prompt }] : []),
        ...data
          .map((c) => [
            { role: "user", content: c.question },
            { role: "assistant", content: c.answer },
          ])
          .flat(),
        { role: "user", content: question },
      ];

      debugLog("Messages Prepared", { messages });

      const response = await callGrokAPI(
        {
          model: model.option || DEFAULT_MODEL.id,
          messages: messages as unknown as string[],
          stream: useStream,
        },
        { signal: abortSignal },
      );

      if (useStream) {
        debugLog("Processing streaming response");
        for await (const chunk of response) {
          try {
            // Handle both content and reasoning_content
            const content = chunk.choices?.[0]?.delta?.content || chunk.choices?.[0]?.delta?.reasoning_content;
            if (content) {
              chat.answer += content;
              setStreamData({ ...chat, answer: chat.answer });
              debugLog("Stream chunk processed", { content });
            } else {
              debugLog("No content in chunk", { chunk });
            }
          } catch (error) {
            debugLog("Stream processing error", { error: String(error) });
            await showToast({
              title: "Error",
              message: `Couldn't stream message: ${error}`,
              style: Toast.Style.Failure,
            });
            setErrorMsg(`Couldn't stream message: ${error}`);
            setLoading(false);
            return;
          }
        }
        setStreamData(undefined);
        debugLog("Streaming completed");
      } else {
        const content = response.choices?.[0]?.message?.content || response.choices?.[0]?.message?.reasoning_content;
        if (content) {
          chat = { ...chat, answer: content };
          debugLog("Non-streaming response processed", { answer: content });
        } else {
          debugLog("No content in non-streaming response", { response });
          throw new Error("No content returned from Grok API");
        }
      }

      if (isAutoTTS) {
        say.stop();
        say.speak(chat.answer);
        debugLog("Text-to-speech triggered", { answer: chat.answer });
      }

      setLoading(false);
      if (abortSignal.aborted) {
        await showToast({
          title: "Request canceled",
          style: Toast.Style.Failure,
        });
        setIsAborted(true);
      } else {
        await showToast({
          title: "Got Grok's answer!",
          style: Toast.Style.Success,
        });
        debugLog("Answer received successfully", { chat });
      }

      setData((prev) => {
        const updated = prev.map((a) => (a.id === chat.id ? chat : a));
        debugLog("Chat data updated", { updatedChatId: chat.id });
        return updated;
      });

      if (!isHistoryPaused) {
        await history.add(chat);
        debugLog("Chat added to history", { chatId: chat.id });
      }
    } catch (err: any) {
      debugLog("Error in ask", { error: String(err), stack: err.stack });
      if (abortSignal.aborted) {
        await showToast({
          title: "Request canceled",
          style: Toast.Style.Failure,
        });
        setIsAborted(true);
      } else {
        let message = "Failed to get Grok's response";
        if (err.message?.includes("429")) {
          message = "Rate limit reached for requests (1 req/sec or 60-1200 req/hour)";
        } else if (err.message?.includes("403")) {
          message = "Invalid API key or insufficient permissions";
        } else if (err.message?.includes("404")) {
          message = "Model not found or incorrect endpoint";
        } else if (err.message) {
          message = err.message;
        }
        await showToast({
          title: "Error",
          message,
          style: Toast.Style.Failure,
        });
        setErrorMsg(message);
      }
      setLoading(false);
    }
  }

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      debugLog("Request aborted");
    }
  }, []);

  const clear = useCallback(async () => {
    setData([]);
    debugLog("Chat data cleared");
  }, [setData]);

  return useMemo(
    () => ({
      data,
      errorMsg,
      setData,
      isLoading,
      setLoading,
      isAborted,
      setIsAborted,
      selectedChatId,
      setSelectedChatId,
      ask,
      clear,
      streamData,
      abort,
    }),
    [
      data,
      errorMsg,
      setData,
      isLoading,
      setLoading,
      isAborted,
      setIsAborted,
      selectedChatId,
      setSelectedChatId,
      ask,
      clear,
      streamData,
      abort,
    ],
  );
}
