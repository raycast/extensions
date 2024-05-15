import { clearSearchBar, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";
import say from "say";
import { v4 as uuidv4 } from "uuid";
import { Chat, ChatHook, Model } from "../type";
import { buildUserMessage, chatTransformer, imgFormat } from "../utils";
import { useAutoTTS } from "./useAutoTTS";
import { getConfiguration, useChatGPT } from "./useChatGPT";
import { useHistory } from "./useHistory";
import { useProxy } from "./useProxy";
import { ChatCompletion, ChatCompletionChunk } from "openai/resources/chat/completions";
import { Stream } from "openai/streaming";

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

  async function ask(question: string, files: string[], model: Model) {
    clearSearchBar();

    setLoading(true);
    const toast = await showToast({
      title: "Getting your answer...",
      style: Toast.Style.Animated,
    });
    // Format images to base64
    const base64Images = files.map((f) => imgFormat(f));
    let chat: Chat = {
      id: uuidv4(),
      question,
      images: base64Images,
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

    await chatGPT.chat.completions
      .create(
        {
          model: model.option,
          temperature: Number(model.temperature),
          messages: [
            ...chatTransformer(data.reverse(), model.prompt),
            { role: "user", content: [...buildUserMessage(question, base64Images)] },
          ],
          stream: useStream,
        },
        {
          httpAgent: proxy,
          // https://github.com/openai/openai-node/blob/master/examples/azure.ts
          // Azure OpenAI requires a custom baseURL, api-version query param, and api-key header.
          query: { ...getHeaders().params },
          headers: { ...getHeaders().apiKey },
        }
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
              toast.title = "Error";
              toast.message = `Couldn't stream message: ${error}`;
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

          if (isAutoTTS) {
            say.stop();
            say.speak(chat.answer);
          }
        }
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
        if (!isHistoryPaused) {
          await history.add(chat);
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
