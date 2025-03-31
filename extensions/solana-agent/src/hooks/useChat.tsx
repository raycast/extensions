import { clearSearchBar, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCallback, useMemo, useRef, useState } from "react";
import say from "say";
import { v4 as uuidv4 } from "uuid";
import type { Chat, ChatHook, Model } from "../type";
import { chatTransformer } from "../utils";
import { useAutoTTS } from "./useAutoTTS";
import { useHistory } from "./useHistory";
import useAgentKit from "./useAgentKit";
import useAI from "./useAI";
import { generateText } from "ai";
import fetch from "node-fetch";

// @ts-expect-error - unnecessary type mismatch
globalThis.fetch = fetch;

export function useChat<T extends Chat>(props: T[]): ChatHook {
  const [data, setData] = useState<Chat[]>(props);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [isAborted, setIsAborted] = useState<boolean>(false);
  const [streamData] = useState<Chat | undefined>();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [isHistoryPaused] = useState<boolean>(() => {
    return getPreferenceValues<{
      isHistoryPaused: boolean;
    }>().isHistoryPaused;
  });

  const history = useHistory();
  const isAutoTTS = useAutoTTS();
  const { tools } = useAgentKit();
  const openai = useAI();

  async function ask(question: string, files: string[], model: Model) {
    clearSearchBar();

    setLoading(true);
    const toast = await showToast({
      title: "Getting your answer...",
      style: Toast.Style.Animated,
    });
    let chat: Chat = {
      id: uuidv4(),
      question,
      files,
      answer: "",
      created_at: new Date().toISOString(),
    };

    setData((prev) => {
      return [...prev, chat];
    });

    setTimeout(async () => {
      setSelectedChatId(chat.id);
    }, 50);

    abortControllerRef.current = new AbortController();
    const { signal: abortSignal } = abortControllerRef.current;

    try {
      const res = await generateText({
        model: openai(model.option),
        temperature: Number(model.temperature),
        tools,
        messages: chatTransformer([...data.reverse(), chat], model.prompt),
        maxSteps: 5,
      });

      const completion = res.text;
      chat = { ...chat, answer: completion ?? "" };

      if (isAutoTTS) {
        say.stop();
        say.speak(chat.answer);
      }
      setLoading(false);
      if (abortSignal.aborted) {
        toast.title = "Request canceled";
        toast.style = Toast.Style.Failure;
        setIsAborted(true);
      } else {
        toast.title = "Got your answer!";
        toast.style = Toast.Style.Success;
      }

      setData((prev) => {
        return prev.map((a) => {
          if (a.id === chat.id) {
            return chat;
          }
          return a;
        });
      });

      if (!isHistoryPaused) {
        await history.add(chat);
      }
    } catch (err) {
      console.log(err);
      if (abortSignal.aborted) {
        toast.title = "Request canceled";
        toast.message = undefined;
        setIsAborted(true);
        // @ts-expect-error error is an object
      } else if (err?.message) {
        // @ts-expect-error error is an object
        if (err.message.includes("429")) {
          const message = "Rate limit reached for requests";
          toast.title = "Error";
          toast.message = message;
          setErrorMsg(message);
        } else {
          toast.title = "Error";
          // @ts-expect-error error is an object
          toast.message = err.message;
          // @ts-expect-error error is an object
          setErrorMsg(err.message);
        }
      }
      toast.style = Toast.Style.Failure;
      setLoading(false);
    }
  }

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const clear = useCallback(async () => {
    setData([]);
  }, []);

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
    [data, errorMsg, isLoading, isAborted, selectedChatId, clear, streamData, abort],
  );
}
