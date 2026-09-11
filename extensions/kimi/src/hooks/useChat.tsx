import { getPreferenceValues, clearSearchBar, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Chat, ChatHook, Model } from "../type";
import { chatTransformer } from "../utils";
import { useKimi } from "./useKimi";
import { useHistory } from "./useHistory";

const STREAM_UPDATE_INTERVAL_MS = 50;

interface KimiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface KimiStreamResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

export function useChat<T extends Chat>(props: T[]): ChatHook {
  const [data, setData] = useState<Chat[]>(props);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [useStream] = useState<boolean>(() => {
    return getPreferenceValues<{
      useStream: boolean;
    }>().useStream;
  });
  const [streamData, setStreamData] = useState<Chat | undefined>();

  // Ref to track the current stream reader for cleanup/abort
  const abortControllerRef = useRef<AbortController | null>(null);
  // Ref for throttled updates
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const history = useHistory();
  const kimiConfig = useKimi();

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, []);

  async function ask(question: string, model: Model) {
    clearSearchBar();
    setLoading(true);

    const toast = await showToast({
      title: "Getting your answer...",
      style: Toast.Style.Animated,
    });

    const chat: Chat = {
      id: uuidv4(),
      question,
      answer: "",
      created_at: new Date().toISOString(),
    };

    // Build messages array using current data + new chat
    const currentData = [...data, chat];

    const messages: KimiMessage[] = [];
    if (model.prompt) {
      messages.push({ role: "system", content: model.prompt });
    }
    messages.push(...(chatTransformer(currentData) as KimiMessage[]));

    setData(currentData);

    if (useStream) {
      // Abort any existing stream before starting a new one
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }

      const streamedChat = { ...chat, answer: "" };
      let pendingUpdate = false;

      // Set up throttled UI updates
      updateIntervalRef.current = setInterval(() => {
        if (pendingUpdate) {
          setStreamData({ ...streamedChat });
          setData((prev) => prev.map((a) => (a.id === chat.id ? { ...streamedChat } : a)));
          pendingUpdate = false;
        }
      }, STREAM_UPDATE_INTERVAL_MS);

      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(`${kimiConfig.baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${kimiConfig.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: model.option,
            temperature: Number(model.temperature),
            max_tokens: Number(model.max_tokens) || 4096,
            messages: messages,
            stream: true,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (!abortControllerRef.current?.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine === "data: [DONE]") continue;
            if (trimmedLine.startsWith("data: ")) {
              try {
                const jsonData: KimiStreamResponse = JSON.parse(trimmedLine.slice(6));
                const content = jsonData.choices?.[0]?.delta?.content;
                if (content) {
                  streamedChat.answer += content;
                  pendingUpdate = true;
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }

        // Clear the update interval
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
          updateIntervalRef.current = null;
        }
        // Flush any pending update to ensure last chunk is rendered
        if (pendingUpdate) {
          setStreamData({ ...streamedChat });
        }
        // Final update with complete answer
        setData((prev) => prev.map((a) => (a.id === chat.id ? { ...streamedChat } : a)));
        setStreamData(undefined);
        abortControllerRef.current = null;
        history.add({ ...streamedChat });
        setLoading(false);
        toast.title = "Got your answer!";
        toast.style = Toast.Style.Success;
      } catch (err) {
        // Clear the update interval
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
          updateIntervalRef.current = null;
        }
        abortControllerRef.current = null;
        toast.title = "Error";
        toast.message = `Couldn't stream message: ${err}`;
        toast.style = Toast.Style.Failure;
        setLoading(false);
      }
    } else {
      try {
        const response = await fetch(`${kimiConfig.baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${kimiConfig.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: model.option,
            temperature: Number(model.temperature),
            max_tokens: Number(model.max_tokens) || 4096,
            messages: messages,
            stream: false,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
        }

        const result = await response.json();
        const finalChat: Chat = { ...chat, answer: result.choices?.[0]?.message?.content || "" };

        toast.title = "Got your answer!";
        toast.style = Toast.Style.Success;
        setLoading(false);

        // Update data and history for non-streaming mode
        setData((prev) => {
          return prev.map((a) => {
            if (a.id === finalChat.id) {
              return finalChat;
            }
            return a;
          });
        });

        history.add(finalChat);
      } catch (err) {
        toast.title = "Error";
        if (err instanceof Error) {
          toast.message = err?.message;
        }
        toast.style = Toast.Style.Failure;
        setLoading(false);
      }
    }
  }

  const clear = useCallback(async () => {
    setData([]);
  }, [setData]);

  return useMemo(
    () => ({ data, setData, isLoading, setLoading, selectedChatId, setSelectedChatId, ask, clear, streamData }),
    [data, setData, isLoading, setLoading, selectedChatId, setSelectedChatId, ask, clear, streamData],
  );
}
