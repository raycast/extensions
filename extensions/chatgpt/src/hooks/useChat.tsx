import { clearSearchBar, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";
import say from "say";
import { v4 as uuidv4 } from "uuid";
import { Chat, ChatHook, CreateChatCompletionDeltaResponse, Model } from "../type";
import { chatTransfomer } from "../utils";
import { useAutoTTS } from "./useAutoTTS";
import { useChatGPT } from "./useChatGPT";
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
          proxy,
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

                if (content) chat.answer += response.choices[0].delta.content;

                setTimeout(async () => {
                  setData((prev) => {
                    return prev.map((a) => {
                      if (a.id === chat.id) {
                        return chat;
                      }
                      return a;
                    });
                  });
                }, 5);
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
        toast.title = "Error";
        if (err) {
          if (err?.response?.data?.error?.message) {
            if (err.response.data.error.status === 429 || err.response.data.error.message.includes("429")) {
              toast.message = "Please upgrade your account to pay-as-you-go";
            } else {
              toast.message = err.response.data.error.message;
            }
          } else {
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
    () => ({ data, setData, isLoading, setLoading, selectedChatId, setSelectedChatId, ask, clear }),
    [data, setData, isLoading, setLoading, selectedChatId, setSelectedChatId, ask, clear]
  );
}
