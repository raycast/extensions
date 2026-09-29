import { clearSearchBar, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCallback, useMemo, useRef, useState } from "react";
import say from "say";
import { v4 as uuidv4 } from "uuid";
import { Chat, ChatHook, Message, Model } from "../type";
import { buildUserMessage, chatTransformer } from "../utils";
import { requestCodexResponse } from "../utils/codex-responses";
import { listCodexAppServerModels } from "../utils/codex-app-server";
import { resolveAuthStatus } from "../utils/auth";
import { resolveModelOption, normalizeAvailableOptions } from "../utils/model-support";
import { useAutoTTS } from "./useAutoTTS";
import { getConfiguration, useChatGPT } from "./useChatGPT";
import { useHistory } from "./useHistory";
import { useProxy } from "./useProxy";
import { ResponseInput, ResponseInputContent } from "openai/resources/responses/responses";

function toResponseInput(messages: Message[]): ResponseInput {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => {
      if (typeof message.content === "string")
        return { role: message.role as "user" | "assistant", content: message.content };
      const parts = Array.isArray(message.content) ? message.content : [];
      const content: ResponseInputContent[] = [];
      for (const part of parts) {
        if (part.type === "text") content.push({ type: "input_text", text: part.text });
        if (part.type === "image_url")
          content.push({
            type: "input_image",
            image_url: typeof part.image_url === "string" ? part.image_url : part.image_url.url,
            detail: "auto",
          });
      }
      return { role: message.role as "user" | "assistant", content };
    });
}

export function useChat<T extends Chat>(props: T[], initialCodexThreadId?: string | null): ChatHook {
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
  const codexThreadRef = useRef<{ threadId: string | null; instructions: string }>({
    threadId: initialCodexThreadId ?? null,
    instructions: "",
  });

  const [isHistoryPaused] = useState<boolean>(() => {
    return getPreferenceValues<{
      isHistoryPaused: boolean;
    }>().isHistoryPaused;
  });

  const history = useHistory();
  const isAutoTTS = useAutoTTS();
  const proxy = useProxy();
  const chatGPT = useChatGPT({ allowMissingApiKey: true });

  async function ask(question: string, files: string[], model: Model) {
    clearSearchBar();

    setErrorMsg(null);
    setIsAborted(false);
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
      if (!config.useAzure) {
        return { apiKey: {}, params: {} };
      }
      return {
        apiKey: { "api-key": config.apiKey ?? "" },
        params: { "api-version": "2023-06-01-preview" },
      };
    };

    abortControllerRef.current = new AbortController();
    const { signal: abortSignal } = abortControllerRef.current;
    const headers = getHeaders();
    const requestOptions = {
      httpAgent: proxy,
      // https://github.com/openai/openai-node/blob/master/examples/azure.ts
      // Azure OpenAI requires a custom baseURL, api-version query param, and api-key header.
      query: { ...headers.params },
      headers: { ...headers.apiKey },
      signal: abortSignal,
    };
    const selectedReasoningEffort = model.enableReasoningEffortChange
      ? model.option === "gpt-6-astra" && model.reasoningEffort === "none"
        ? "low"
        : model.reasoningEffort
      : "medium";

    try {
      const auth = await resolveAuthStatus();
      const codexModels = auth.provider === "chatgpt" ? await listCodexAppServerModels() : [];
      const availableOptions =
        auth.provider === "chatgpt"
          ? normalizeAvailableOptions(codexModels.filter((item) => !item.hidden).map((item) => item.model || item.id))
          : undefined;
      if (auth.provider === "chatgpt" && availableOptions?.length === 0) {
        throw new Error("Your Codex account does not currently list any available models.");
      }
      const modelOption = resolveModelOption(model.option, availableOptions);

      const messages: Message[] = [
        ...chatTransformer([...data].reverse(), model.prompt),
        { role: "user", content: buildUserMessage(question, auth.provider === "chatgpt" ? [] : files) },
      ];

      if (auth.provider === "chatgpt" && modelOption !== model.option) {
        toast.message = `Using ${modelOption} for ChatGPT sign-in.`;
      }

      if (auth.provider === "chatgpt") {
        const onDelta = (content: string) => {
          if (!content) {
            return;
          }
          chat.answer += content;
          setStreamData({ ...chat, answer: chat.answer });
        };

        const instructions = model.prompt;
        const currentCodexThreadId =
          codexThreadRef.current.instructions === instructions ? codexThreadRef.current.threadId : null;

        const response = await requestCodexResponse({
          model: modelOption,
          effort: selectedReasoningEffort,
          supportedEfforts: codexModels
            .find((item) => (item.model || item.id) === modelOption)
            ?.supportedReasoningEfforts?.map((item) => item.reasoningEffort),
          messages,
          imagePaths: files,
          instructions,
          stream: useStream,
          signal: abortSignal,
          onDelta,
          threadId: currentCodexThreadId,
        });

        codexThreadRef.current = {
          threadId: response.threadId,
          instructions,
        };

        chat = { ...chat, answer: response.text };

        if (useStream) {
          setTimeout(async () => {
            setStreamData(undefined);
          }, 5);
        }
      } else {
        if (auth.provider === "none") {
          throw new Error("You are not signed in. Add an API key in extension preferences or sign in with ChatGPT.");
        }

        if (!chatGPT) {
          throw new Error("OpenAI API key is missing. Add it in extension preferences.");
        }

        const request = {
          model: modelOption,
          instructions: model.prompt,
          input: toResponseInput(messages),
          ...(model.enableReasoningEffortChange ? { reasoning: { effort: selectedReasoningEffort } } : {}),
          store: false,
        } as const;
        if (useStream) {
          const stream = await chatGPT.responses.create({ ...request, stream: true }, requestOptions);
          for await (const event of stream) {
            if (event.type === "response.output_text.delta") {
              chat.answer += event.delta;
              setStreamData({ ...chat, answer: chat.answer });
            } else if (event.type === "response.failed") {
              throw new Error(event.response.error?.message || "OpenAI response failed.");
            } else if (event.type === "error") {
              throw new Error(event.message);
            }
          }
          setStreamData(undefined);
        } else {
          const response = await chatGPT.responses.create({ ...request, stream: false }, requestOptions);
          chat = { ...chat, answer: response.output_text };
        }
      }

      if (isAutoTTS) {
        say.stop();
        say.speak(chat.answer);
      }
      setLoading(false);
      if (abortSignal.aborted) {
        toast.title = "Request canceled";
        toast.message = undefined;
        toast.style = Toast.Style.Failure;
        setIsAborted(true);
      } else {
        toast.title = "Got your answer!";
        toast.message = undefined;
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
    } catch (err) {
      if (abortSignal.aborted || isAbortError(err)) {
        toast.title = "Request canceled";
        toast.message = undefined;
        setIsAborted(true);
      } else if (err instanceof Error) {
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
    }
  }

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const clear = useCallback(async () => {
    setData([]);
    codexThreadRef.current = { threadId: null, instructions: "" };
  }, [setData]);

  return useMemo(
    () => ({
      data,
      codexThreadId: codexThreadRef.current.threadId,
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
      codexThreadRef.current.threadId,
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

function isAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const lowerMessage = error.message.toLowerCase();
  return error.name === "AbortError" || lowerMessage.includes("abort") || lowerMessage.includes("canceled");
}
