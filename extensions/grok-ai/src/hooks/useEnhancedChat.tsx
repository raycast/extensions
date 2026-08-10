/* eslint-disable @typescript-eslint/no-explicit-any */

import { clearSearchBar, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCallback, useMemo, useRef, useState } from "react";
import say from "say";
import { v4 as uuidv4 } from "uuid";
import { Chat, ChatHook, Model } from "../type";
import { useAutoTTS } from "./useAutoTTS";
import { useHistory } from "./useHistory";
import { DEFAULT_MODEL } from "./useModel";
import { useRobustStreaming } from "./useRobustStreaming";
import { StreamRecoveryManager } from "../utils/stream-recovery";

// Debug logging utility
function debugLog<T>(message: string, data?: T) {
  console.log(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : "");
}

async function callGrokAPINonStreaming(
  params: { model: string; messages: Array<{ role: string; content: string }>; stream: boolean },
  options: { signal: AbortSignal; onRetry?: (attempt: number) => void },
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

  const recoveryManager = new StreamRecoveryManager({
    maxRetries: 3,
    enablePartialRecovery: false,
    onRetry: options.onRetry,
  });

  let lastError: Error | null = null;

  while (true) {
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
        const error = new Error(`HTTP ${response.status}: ${errorText || response.statusText}`) as Error & {
          statusCode: number;
        };
        error.statusCode = response.status;

        const streamError = recoveryManager.classifyError(error);
        if (await recoveryManager.shouldRetry(streamError)) {
          await recoveryManager.prepareRetry(streamError);
          continue;
        }
        throw error;
      }

      const json = await response.json();
      debugLog("API Non-Streaming Response", json);
      return json;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const streamError = recoveryManager.classifyError(error);

      if (await recoveryManager.shouldRetry(streamError)) {
        await recoveryManager.prepareRetry(streamError);
        continue;
      }

      debugLog("API Call Failed", { error: String(error), stack: lastError.stack });
      throw lastError;
    }
  }
}

function getErrorMessage(error: any): string {
  if (error.message?.includes("429")) {
    return "Rate limit reached for requests (1 req/sec or 60-1200 req/hour)";
  } else if (error.message?.includes("403")) {
    return "Invalid API key or insufficient permissions";
  } else if (error.message?.includes("404")) {
    return "Model not found or incorrect endpoint";
  } else if (error.message?.includes("timeout")) {
    return "Request timed out. Please try again.";
  } else if (error.message?.includes("network")) {
    return "Network error. Please check your connection.";
  } else if (error.message?.includes("token") || error.message?.includes("limit")) {
    return "Context length exceeded. Please start a new conversation.";
  } else if (error.message) {
    return error.message;
  }
  return "Failed to get Grok's response";
}

export function useEnhancedChat<T extends Chat>(props: T[]): ChatHook {
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
  const currentChatRef = useRef<Chat | null>(null);

  const [isHistoryPaused] = useState<boolean>(() => {
    const paused = getPreferenceValues<{ isHistoryPaused: boolean }>().isHistoryPaused;
    debugLog("History Paused Preference", { isHistoryPaused: paused });
    return paused;
  });

  const history = useHistory();
  const isAutoTTS = useAutoTTS();

  const robustStreaming = useRobustStreaming({
    onData: useCallback((chunk: string) => {
      if (currentChatRef.current) {
        currentChatRef.current.answer += chunk;
        setStreamData({ ...currentChatRef.current });
      }
    }, []),
    onError: useCallback((error: Error) => {
      debugLog("Streaming error", { error: String(error) });
      setErrorMsg(getErrorMessage(error));
    }, []),
    onComplete: useCallback(() => {
      debugLog("Streaming completed");
    }, []),
    onConnectionChange: useCallback((connected: boolean) => {
      debugLog("Connection state changed", { connected });
    }, []),
    maxRetries: 3,
  });

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

      if (useStream) {
        debugLog("Using robust streaming");
        currentChatRef.current = chat;
        setStreamData(chat);

        const apiKey = getPreferenceValues<{ apiKey: string }>().apiKey;
        const endpoint = "https://api.x.ai/v1/chat/completions";

        await robustStreaming.start(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model.option || DEFAULT_MODEL.id,
            messages: messages,
            stream: true,
          }),
          signal: abortSignal,
        });

        chat.answer = currentChatRef.current?.answer || robustStreaming.data || "";
        currentChatRef.current = null;
        setStreamData(undefined);
      } else {
        const response = await callGrokAPINonStreaming(
          {
            model: model.option || DEFAULT_MODEL.id,
            messages: messages,
            stream: false,
          },
          {
            signal: abortSignal,
            onRetry: (attempt) => {
              showToast({
                title: `Retrying... (Attempt ${attempt}/3)`,
                style: Toast.Style.Animated,
              });
            },
          },
        );

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
        const message = getErrorMessage(err);
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
      robustStreaming.stop();
      currentChatRef.current = null;
      debugLog("Request aborted");
    }
  }, [robustStreaming]);

  const clear = useCallback(async () => {
    setData([]);
    robustStreaming.reset();
    currentChatRef.current = null;
    debugLog("Chat data cleared");
  }, [setData, robustStreaming]);

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
