import { Toast, clearSearchBar, showToast, useNavigation } from "@raycast/api";
import { useCallback, useMemo, useRef, useState } from "react";
import { v4 as uuidV5 } from "uuid";
import { debounce } from "lodash";
import { Chat, ChatHook, TemplateModel } from "../type";
import { Error } from "../views/error";
import { useChatGo } from "./useChatGo";
import { chatTransfomer } from "../utils";
import { useHistory } from "./useHistory";

export function useChat<T extends Chat>(props: T[]): ChatHook {
  const [data, setData] = useState<Chat[]>(props || []);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isLoading, setLoading] = useState<boolean>(false);
  const timer1 = useRef<NodeJS.Timeout | undefined>(undefined);
  const timer2 = useRef<NodeJS.Timeout | undefined>(undefined);

  const debouncedSetData = debounce(setData, 10);

  const history = useHistory();
  const chatGo = useChatGo();
  const { push } = useNavigation();

  const ask = async (question: string, model: TemplateModel) => {
    await clearSearchBar();

    setLoading(true);
    const toast = await showToast({
      title: "Getting your answer...",
      style: Toast.Style.Animated,
    });

    const chat: Chat = {
      id: uuidV5(),
      question,
      answer: "",
      created_at: new Date().toISOString(),
    };

    setData((prev) => {
      return [...prev, chat];
    });

    timer1.current = setTimeout(() => {
      setSelectedChatId(chat.id);
    }, 100);

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
        if (data.code === "300001") {
          push(
            <Error
              title={data.msg}
              description="Go to the official website (https://www.chatgo.pro) for more information"
            />
          );
          setLoading(false);
          return;
        }
        const content = data.choices[0].delta?.content;
        if (content) {
          chat.answer += content;
        }

        debouncedSetData((prev) => {
          return prev.map((a) => {
            if (a.id === chat.id) {
              return chat;
            }
            return a;
          });
        });
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
      },
    });
  };

  const clear = useCallback(async () => {
    setData([]);
    clearTimeout(timer1.current);
    clearTimeout(timer2.current);
  }, [setData]);

  return useMemo(
    () => ({ data, setData, isLoading, setLoading, selectedChatId, setSelectedChatId, ask, clear }),
    [data, setData, isLoading, setLoading, selectedChatId, setSelectedChatId, ask, clear]
  );
}
