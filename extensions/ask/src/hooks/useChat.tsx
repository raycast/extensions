import { clearSearchBar, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Chat, ChatHook, Prompt } from "../type";
import { chatTransfomer } from "../utils";
import { useChatGPT } from "./useChatGPT";
import { ChatCompletionChunk } from "openai/resources/chat/completions";
import { Stream } from "openai/streaming";

export function useChat<T extends Chat>(props: T[]): ChatHook {
  const [data, setData] = useState<Chat[]>(props);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [streamData, setStreamData] = useState<Chat | undefined>();

  const chatGPT = useChatGPT();

  async function ask(question: string, model: Prompt) {
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

    await chatGPT.chat.completions
      .create(
        {
          model: model.option,
          temperature: Number(model.temperature),
          messages: [...chatTransfomer(data.reverse(), model.prompt), { role: "user", content: question }],
          stream: true,
        },
        {}
      )
      .then(async (res) => {
        const stream = res as Stream<ChatCompletionChunk>;

        for await (const chunk of stream) {
          try {
            const content = chunk.choices[0]?.delta?.content;

            if (content) {
              chat.answer += chunk.choices[0].delta.content;
              setStreamData({ ...chat, answer: chat.answer });
            }
          } catch (error) {
            toast.title = "Error";
            toast.message = `Couldn't stream message: ${error}`;
            toast.style = Toast.Style.Failure;
            setLoading(false);
          }
        }

        setTimeout(async () => {
          setStreamData(undefined);
        }, 5);

        setLoading(false);
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
