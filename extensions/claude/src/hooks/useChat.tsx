import { getPreferenceValues, clearSearchBar, showToast, Toast } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Chat, ChatHook, Model } from "../type";
import { chatTransformer } from "../utils";
import { useAnthropic } from "./useAnthropic";
import { useHistory } from "./useHistory";

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

  const history = useHistory();
  const chatAnthropic = useAnthropic();

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
      chatAnthropic.messages
        .stream({
          model: model.option,
          temperature: Number(model.temperature),
          system: model.prompt,
          max_tokens: Number(model.max_tokens) || 4096,
          messages: [...chatTransformer(data), { role: "user", content: question }],
        })
        .on("text", (res) => {
          chat.answer += res;
          setStreamData({ ...chat, answer: chat.answer });
        })
        .on("error", (err) => {
          toast.title = "Error";
          toast.message = `Couldn't stream message: ${err}`;
          toast.style = Toast.Style.Failure;
          setLoading(false);
        })
        .on("end", () => {
          setData((prev) => {
            return prev.map((a) => {
              if (a.id === chat.id) {
                return { ...chat, answer: chat.answer };
              }
              return a;
            });
          });
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
        })
        .catch((err) => {
          toast.title = "Error";
          if (err instanceof Error) {
            toast.message = err?.message;
          }
          toast.style = Toast.Style.Failure;
        });
    }

    setData((prev) => {
      return prev.map((a) => {
        if (a.id === chat.id) {
          return chat;
        }
        return a;
      });
    });

    setLoading(false);

    toast.title = "Got your answer!";
    toast.style = Toast.Style.Success;

    history.add(chat);
  }

  const clear = useCallback(async () => {
    setData([]);
  }, [setData]);

  return useMemo(
    () => ({ data, setData, isLoading, setLoading, selectedChatId, setSelectedChatId, ask, clear, streamData }),
    [data, setData, isLoading, setLoading, selectedChatId, setSelectedChatId, ask, clear, streamData]
  );
}
