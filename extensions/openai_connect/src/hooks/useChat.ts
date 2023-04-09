import type { Chat, ChatHook, CreateChatCompletionDeltaResponse, CreateCompletionResponse } from "../types";
import { useHistory } from "./useHistory";
import { useOpenAi } from "./useOpenAi";
import { clearSearchBar, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { ChatCompletionRequestMessageRoleEnum } from "openai";
import { useState, FC, useCallback, useMemo, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

export const useChat = <T extends Chat>(props: T[]): ChatHook => {
  const [data, setData] = useState<Chat[]>(props);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isLoading, setLoading] = useState<boolean>(false);
  const { chatCompletion, prepairPayload, openAi, textCompletion } = useOpenAi();
  const history = useHistory();
  const [useStream] = useState<boolean>(() => {
    return getPreferenceValues<{
      useStream: boolean;
    }>().useStream;
  });

  async function ask(question: string, model: string, conversationId: string) {
    clearSearchBar();

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
      model: model,
      conversationId: conversationId,
    };

    setData((prev) => {
      return [...prev, chat];
    });

    setTimeout(async () => {
      setSelectedChatId(chat.id);
    }, 50);

    if (model == "gpt-3.5-turbo") {
      //   console.log("gpt-3.5-turbo");
      const params = prepairPayload(data.reverse(), question);

      await handleChatResponse(params, toast, chat, model);
    } else {
      //   console.log("other", model);
      const params = question;
      await handlerCompletionResponse(params, toast, chat, model);
    }
  }

  const clear = useCallback(async () => {
    setData([]);
  }, [setData]);

  const handleChatResponse = async (
    params: {
      role: ChatCompletionRequestMessageRoleEnum;
      content: string;
    }[],
    toast: Toast,
    chat: Chat,
    model: string
  ) => {
    try {
      const res = await chatCompletion(params, useStream, model);
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

              history.add(chat);
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
      }
    } catch (error) {
      const e = error as any;
      toast.title = "Error";
      if (error) {
        if (e?.response?.data?.error?.message) {
          toast.message = e.response.data.error.message;
        } else {
          toast.message = e.message;
        }
      }
      toast.style = Toast.Style.Failure;
      setLoading(false);
    }
  };

  const handlerCompletionResponse = async (question: string, toast: Toast, chat: Chat, model: string) => {
    try {
      const res = await textCompletion(question, model, useStream);
      if (useStream) {
        (res.data as any).on("data", (data: CreateCompletionResponse) => {
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
              history.add(chat);
              return;
            }
            try {
              const response: CreateCompletionResponse = JSON.parse(message);

              const content = response.choices[0].text || "";

              if (content) chat.answer += response.choices[0].text;

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
        chat = { ...chat, answer: res.data.choices.map((x) => x.text)[0] ?? "" };
        if (typeof chat.answer === "string") {
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
          history.add(chat);
        }
      }
    } catch (error) {
      const e = error as any;
      toast.title = "Error";
      if (error) {
        if (e?.response?.data?.error?.message) {
          toast.message = e.response.data.error.message;
        } else {
          toast.message = e.message;
        }
      }
      toast.style = Toast.Style.Failure;
      setLoading(false);
    }
  };

  return useMemo(
    () => ({ data, setData, isLoading, setLoading, selectedChatId, setSelectedChatId, ask, clear }),
    [data, setData, isLoading, setLoading, selectedChatId, setSelectedChatId, ask, clear]
  );
};
