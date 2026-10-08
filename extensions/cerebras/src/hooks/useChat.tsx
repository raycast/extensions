import { clearSearchBar, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCallback, useMemo, useRef, useState } from "react";
import say from "say";
import { v4 as uuidv4 } from "uuid";
import { Chat, ChatHook, Model } from "../type";
import { buildUserMessage, chatTransformer } from "../utils";
import { useAutoTTS } from "./useAutoTTS";
import { getConfiguration, useChatGPT } from "./useChatGPT";
import { useHistory } from "./useHistory";
import { useProxy } from "./useProxy";
import { ChatCompletion, ChatCompletionChunk } from "openai/resources/chat/completions";
import { Stream } from "openai/streaming";
import { countToken } from "../utils/token"; // Import the token counting utility

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
  const proxy = useProxy();
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
      return {
        apiKey: { "api-key": config.apiKey },
        params: { "api-version": "2023-06-01-preview" },
      };
    };

    abortControllerRef.current = new AbortController();
    const { signal: abortSignal } = abortControllerRef.current;

    const startTime = Date.now(); // Record the start time

    await chatGPT.chat.completions
      .create(
        {
          model: model.option,
          temperature: Number(model.temperature),
          messages: [
            ...chatTransformer(data.reverse(), model.prompt),
            { role: "user", content: buildUserMessage(question, files) },
          ],
          stream: useStream,
        },
        {
          httpAgent: proxy,
          // https://github.com/openai/openai-node/blob/master/examples/azure.ts
          // Azure OpenAI requires a custom baseURL, api-version query param, and api-key header.
          query: { ...getHeaders().params },
          headers: { ...getHeaders().apiKey },
          signal: abortSignal,
        },
      )
      .then(async (res) => {
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

        const endTime = Date.now(); // Record the end time
        const durationInSeconds = (endTime - startTime) / 1000; // Calculate duration in seconds

        // If token usage is not available, approximate it using the response content
        const tokenUsage = countToken(chat.answer);

        const tokensPerSecond = (tokenUsage / durationInSeconds).toFixed(2); // Calculate tokens per second

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
          toast.title = `Answer complete at ${tokensPerSecond} tokens/s`; // Update toast title with tokens per second
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
      })
      .catch((err) => {
        if (abortSignal.aborted) {
          toast.title = "Request canceled";
          toast.message = undefined;
          setIsAborted(true);
        } else if (err?.message) {
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
      });
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
