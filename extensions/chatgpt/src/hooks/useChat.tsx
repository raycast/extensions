import { clearSearchBar, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCallback, useMemo, useRef, useState } from "react";
import say from "say";
import { v4 as uuidv4 } from "uuid";
import { Chat, ChatHook, Model } from "../type";
import { buildUserMessage, chatTransformer } from "../utils";
import { useAutoTTS } from "./useAutoTTS";
import { getConfiguration, useChatGPT } from "./useChatGPT";
import { useHistory } from "./useHistory";
import { ChatCompletion, ChatCompletionChunk } from "openai/resources/chat/completions";
import { Stream } from "openai/streaming";

function hasUnsupportedReasoningEffortError(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  if (!message.includes("reasoning_effort")) {
    return false;
  }
  return (
    message.includes("unknown") ||
    message.includes("unsupported") ||
    message.includes("not allowed") ||
    message.includes("not permitted") ||
    message.includes("unrecognized")
  );
}

function hasUnsupportedTemperatureError(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  if (!message.includes("temperature")) {
    return false;
  }
  return (
    message.includes("unsupported") ||
    message.includes("does not support") ||
    message.includes("not allowed") ||
    message.includes("not permitted") ||
    message.includes("unrecognized")
  );
}

export function useChat<T extends Chat>(props: T[]): ChatHook {
  const [data, setData] = useState<Chat[]>(props);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [isAborted, setIsAborted] = useState<boolean>(false);
  const [useStream] = useState<boolean>(() => {
    return getPreferenceValues<{
      useStream: boolean;
    }>().useStream;
  });
  const [streamData, setStreamData] = useState<Chat | undefined>();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [isHistoryPaused] = useState<boolean>(() => {
    return getPreferenceValues<{
      isHistoryPaused: boolean;
    }>().isHistoryPaused;
  });

  const history = useHistory();
  const isAutoTTS = useAutoTTS();
  const chatGPT = useChatGPT();

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

    const getHeaders = function () {
      const config = getConfiguration();
      if (!config.useAzure) {
        return { apiKey: {}, params: {} };
      }
      return {
        apiKey: { "api-key": config.apiKey },
        params: { "api-version": "2023-06-01-preview" },
      };
    };

    abortControllerRef.current = new AbortController();
    const { signal: abortSignal } = abortControllerRef.current;
    const headers = getHeaders();
    const requestOptions = {
      // https://github.com/openai/openai-node/blob/master/examples/azure.ts
      // Azure OpenAI requires a custom baseURL, api-version query param, and api-key header.
      query: { ...headers.params },
      headers: { ...headers.apiKey },
      signal: abortSignal,
    };
    const selectedReasoningEffort =
      model.enableReasoningEffortChange && model.reasoningEffort !== "none" ? model.reasoningEffort : undefined;

    const createCompletion = (includeReasoningEffort: boolean, includeTemperature: boolean) =>
      chatGPT.chat.completions.create(
        {
          model: model.option,
          ...(includeTemperature ? { temperature: Number(model.temperature) } : {}),
          ...(includeReasoningEffort && selectedReasoningEffort ? { reasoning_effort: selectedReasoningEffort } : {}),
          messages: [
            ...chatTransformer(
              [...data].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)),
              model.prompt,
            ),
            { role: "user", content: buildUserMessage(question, files) },
          ],
          stream: useStream,
        },
        requestOptions,
      );
    let includeReasoningEffort = Boolean(selectedReasoningEffort);
    let includeTemperature = true;
    let retriedWithoutReasoningEffort = false;
    let retriedWithoutTemperature = false;

    try {
      let res: ChatCompletion | Stream<ChatCompletionChunk>;
      for (;;) {
        try {
          res = await createCompletion(includeReasoningEffort, includeTemperature);
          break;
        } catch (error) {
          if (includeReasoningEffort && hasUnsupportedReasoningEffortError(error)) {
            includeReasoningEffort = false;
            retriedWithoutReasoningEffort = true;
            toast.title = "Reasoning effort not supported";
            toast.message = "Retrying without effort setting...";
            toast.style = Toast.Style.Animated;
            continue;
          }
          if (includeTemperature && hasUnsupportedTemperatureError(error)) {
            includeTemperature = false;
            retriedWithoutTemperature = true;
            toast.title = "Temperature not supported";
            toast.message = "Retrying with the model's default temperature...";
            toast.style = Toast.Style.Animated;
            continue;
          }
          throw error;
        }
      }

      if (useStream) {
        const stream = res as Stream<ChatCompletionChunk>;

        for await (const chunk of stream) {
          try {
            const content = chunk.choices[0]?.delta?.content;

            if (content) {
              chat.answer += chunk.choices[0].delta.content;
              setStreamData({ ...chat, answer: chat.answer });
            }
          } catch (error) {
            if (abortSignal.aborted) {
              toast.title = "Request canceled";
              toast.message = undefined;
              setIsAborted(true);
            } else {
              const message = `Couldn't stream message: ${error}`;
              toast.title = "Error";
              toast.message = message;
              setErrorMsg(message);
            }
            toast.style = Toast.Style.Failure;
            setLoading(false);
          }
        }

        setTimeout(async () => {
          setStreamData(undefined);
        }, 5);
      } else {
        const completion = res as ChatCompletion;
        chat = { ...chat, answer: completion.choices.map((x) => x.message)[0]?.content ?? "" };
      }
      if (isAutoTTS) {
        say.stop();
        say.speak(chat.answer);
      }
      setLoading(false);
      if (abortSignal.aborted) {
        toast.title = "Request canceled";
        toast.message = undefined;
        toast.style = Toast.Style.Failure;
        setIsAborted(true);
      } else {
        toast.title = "Got your answer!";
        toast.message =
          [
            retriedWithoutReasoningEffort ? "Provider ignored the reasoning effort setting for this response." : null,
            retriedWithoutTemperature ? "Provider ignored the temperature setting for this response." : null,
          ]
            .filter(Boolean)
            .join(" ") || undefined;
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
      if (abortSignal.aborted) {
        toast.title = "Request canceled";
        toast.message = undefined;
        setIsAborted(true);
      } else if (err instanceof Error) {
        if (err.message.includes("429")) {
          const message = "Rate limit reached for requests";
          toast.title = "Error";
          toast.message = message;
          setErrorMsg(message);
        } else {
          toast.title = "Error";
          toast.message = err.message;
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
