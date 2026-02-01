import { getPreferenceValues, clearSearchBar, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Chat, ChatHook, Model } from "../type";
import { chatTransformer } from "../utils";
import { useAnthropic } from "./useAnthropic";
import { useHistory } from "./useHistory";
import { MessageStream } from "@anthropic-ai/sdk/lib/MessageStream";

const STREAM_UPDATE_INTERVAL_MS = 50;

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

  // Ref to track the current stream for cleanup/abort
  const streamRef = useRef<MessageStream | null>(null);
  // Ref for throttled updates
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const history = useHistory();
  const chatAnthropic = useAnthropic();

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.abort();
        streamRef.current = null;
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

    let chat: Chat = {
      id: uuidv4(),
      question,
      answer: "",
      created_at: new Date().toISOString(),
    };

    setData((prev) => {
      return [...prev, chat];
    });

    if (useStream) {
      // Abort any existing stream before starting a new one
      if (streamRef.current) {
        streamRef.current.abort();
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

      const stream = chatAnthropic.messages.stream({
        model: model.option,
        temperature: Number(model.temperature),
        system: model.prompt,
        max_tokens: Number(model.max_tokens) || 4096,
        messages: [...chatTransformer(data), { role: "user", content: question }],
      });

      streamRef.current = stream;

      stream
        .on("text", (res) => {
          streamedChat.answer += res;
          pendingUpdate = true;
        })
        .on("end", () => {
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
          streamRef.current = null;
          history.add({ ...streamedChat });
          setLoading(false);
          toast.title = "Got your answer!";
          toast.style = Toast.Style.Success;
        })
        .on("error", (err) => {
          // Clear the update interval
          if (updateIntervalRef.current) {
            clearInterval(updateIntervalRef.current);
            updateIntervalRef.current = null;
          }
          streamRef.current = null;
          toast.title = "Error";
          toast.message = `Couldn't stream message: ${err}`;
          toast.style = Toast.Style.Failure;
          setLoading(false);
        });
    } else {
      await chatAnthropic.messages
        .create({
          model: model.option,
          temperature: Number(model.temperature),
          system: model.prompt,
          max_tokens: Number(model.max_tokens) || 4096,
          messages: [...chatTransformer(data), { role: "user", content: question }],
        })
        .then(async (res) => {
          if ("content" in res) {
            chat = { ...chat, answer: res.content[0].text };
          }

          toast.title = "Got your answer!";
          toast.style = Toast.Style.Success;
          setLoading(false);
        })
        .catch((err) => {
          toast.title = "Error";
          if (err instanceof Error) {
            toast.message = err?.message;
          }
          toast.style = Toast.Style.Failure;
          setLoading(false);
        });

      // Update data and history only for non-streaming mode
      // (streaming mode handles this in the on("end") handler)
      setData((prev) => {
        return prev.map((a) => {
          if (a.id === chat.id) {
            return chat;
          }
          return a;
        });
      });

      history.add(chat);
    }
  }

  const clear = useCallback(async () => {
    setData([]);
  }, [setData]);

  return useMemo(
    () => ({ data, setData, isLoading, setLoading, selectedChatId, setSelectedChatId, ask, clear, streamData }),
    [data, setData, isLoading, setLoading, selectedChatId, setSelectedChatId, ask, clear, streamData]
  );
}
