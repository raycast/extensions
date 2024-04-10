import { clearSearchBar, showToast, Toast } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Chat, ChatHook, Model } from "../type";
import { chatTransfomer } from "../utils";
import { useAnthropic } from "./useAnthropic";
import { useHistory } from "./useHistory";

export function useChat<T extends Chat>(props: T[]): ChatHook {
  const [data, setData] = useState<Chat[]>(props);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isLoading, setLoading] = useState<boolean>(false);

  const history = useHistory();

  const chatAnthropic = useAnthropic();

  async function ask(question: string, model: Model) {
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
    }, 30);

    await chatAnthropic.messages
      .create({
        model: model.option,
        temperature: model.temperature,
        system: model.prompt,
        max_tokens: 4096,
        messages: [...chatTransfomer(data), { role: "user", content: question }],
      })
      .then((res) => {
        chat = { ...chat, answer: res.content[0].text };
        if (typeof chat.answer === "string") {
          setLoading(false);
          clearSearchBar();

          toast.title = "Got your answer!";
          toast.style = Toast.Style.Success;

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
      })
      .catch((err) => {
        toast.title = "Error";
        if (err instanceof Error) {
          toast.message = err?.message;
        }
        toast.style = Toast.Style.Failure;
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
