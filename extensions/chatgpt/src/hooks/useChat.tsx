import { clearSearchBar, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";
import say from "say";
import { v4 as uuidv4 } from "uuid";
import { Chat, ChatHook, CreateChatCompletionDeltaResponse, Model } from "../type";
import { chatTransfomer } from "../utils";
import { useAutoTTS } from "./useAutoTTS";
import { getConfiguration, useChatGPT } from "./useChatGPT";
import { useHistory } from "./useHistory";
import { useProxy } from "./useProxy";

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

  const [isHistoryPaused] = useState<boolean>(() => {
    return getPreferenceValues<{
      isHistoryPaused: boolean;
    }>().isHistoryPaused;
  });

  const history = useHistory();
  const isAutoTTS = useAutoTTS();
  const proxy = useProxy();
  const chatGPT = useChatGPT();

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

    setTimeout(async () => {
      setSelectedChatId(chat.id);
    }, 50);

    const getHeaders = function () {
      const config = getConfiguration();
      if (!config.useAzure) {
        return { apiKey: "", params: {} };
      }
      return {
        apiKey: config.apiKey,
        params: { "api-version": "2023-03-15-preview" },
      };
    };

    await chatGPT
      .createChatCompletion(
        {
          model: model.option,
          temperature: Number(model.temperature),
          messages: [...chatTransfomer(data.reverse(), model.prompt), { role: "user", content: question }],
          stream: useStream,
        },
        {
          responseType: useStream ? "stream" : undefined,
          headers: { "api-key": getHeaders().apiKey },
          params: getHeaders().params,
          proxy: proxy,
        }
      )
      .then(async (res) => {
        if (useStream) {
          (res.data as any).on("data", (data: CreateChatCompletionDeltaResponse) => {
            const lines = data
              .toString()
              .split("\n")
              .filter((line: string) => line.trim() !== "");

            for (const line of lines) {
              const message = line.replace(/^data: /, "");
              if (message === "[DONE]") {
                setData((prev) => {
                  return prev.map((a) => {
                    if (a.id === chat.id) {
                      return chat;
                    }
                    return a;
                  });
                });

                setTimeout(async () => {
                  setStreamData(undefined);
                }, 5);

                setLoading(false);

                toast.title = "Got your answer!";
                toast.style = Toast.Style.Success;

                if (!isHistoryPaused) {
                  history.add(chat);
                }
                return;
              }
              try {
                const response: CreateChatCompletionDeltaResponse = JSON.parse(message);

                const content = response.choices[0].delta?.content;

                if (content) {
                  chat.answer += response.choices[0].delta.content;
                  setStreamData({ ...chat, answer: chat.answer });
                }
              } catch (error) {
                toast.title = "Error";
                toast.message = `Couldn't stream message`;
                toast.style = Toast.Style.Failure;
                setLoading(false);
              }
            }
          });
        } else {
          chat = { ...chat, answer: res.data.choices.map((x) => x.message)[0]?.content ?? "" };

          if (typeof chat.answer === "string") {
            setLoading(false);

            toast.title = "Got your answer!";
            toast.style = Toast.Style.Success;

            if (isAutoTTS) {
              say.stop();
              say.speak(chat.answer);
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
              history.add(chat);
            }
          }
        }
      })
      .catch((err) => {
        if (err?.message) {
          if (err.message.includes("429")) {
            toast.title = "You've reached your API limit";
            toast.message = "Please upgrade to pay-as-you-go";
          } else {
            toast.title = "Error";
            toast.message = err.message;
          }
        }
        toast.style = Toast.Style.Failure;
        setLoading(false);
      });
  }

  const clear = useCallback(async () => {
    setData([]);
  }, [setData]);

  return useMemo(
    () => ({ data, setData, isLoading, setLoading, selectedChatId, setSelectedChatId, ask, clear, streamData }),
    [data, setData, isLoading, setLoading, selectedChatId, setSelectedChatId, ask, clear, streamData]
  );
}
