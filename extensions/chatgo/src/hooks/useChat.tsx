import { Toast, clearSearchBar, showToast } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Chat, ChatHook, TemplateModel } from "../type";
import { useChatGo } from "./useChatGo";
import { chatTransfomer } from "../utils";
import { useHistory } from "./useHistory";

export function useChat<T extends Chat>(props: T[]): ChatHook {
  const [data, setData] = useState<Chat[]>(props || []);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isLoading, setLoading] = useState<boolean>(false);

  const history = useHistory();
  const chatGo = useChatGo();

  const ask = async (question: string, model: TemplateModel) => {
    await clearSearchBar();

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

    setData((prev) => {
      return [...prev, chat];
    });

    setTimeout(() => {
      setSelectedChatId(chat.id);
    }, 50);

    await chatGo.createChat({
      data: {
        messages: [
          ...chatTransfomer(data.reverse(), undefined),
          {
            role: "user",
            content: question,
          },
        ],
      },
      model,
      onMessage: (data) => {
        const content = data.choices[0].delta?.content;
        if (content) {
          chat.answer += content;
        }
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
      },
      onClose: () => {
        setLoading(false);
        toast.title = "Got your answer!";
        toast.style = Toast.Style.Success;
        history.add(chat);
      },
      onError: () => {
        toast.title = "Error";
        toast.message = `Couldn't stream message`;
        toast.style = Toast.Style.Failure;
        setLoading(false);
        //   TODO  @J 这里需要处理下其他错误，比如，Token 用完需要充值
      },
    });
  };

  const clear = useCallback(async () => {
    setData([]);
  }, [setData]);

  return useMemo(
    () => ({ data, setData, isLoading, setLoading, selectedChatId, setSelectedChatId, ask, clear }),
    [data, setData, isLoading, setLoading, selectedChatId, setSelectedChatId, ask, clear]
  );
}
