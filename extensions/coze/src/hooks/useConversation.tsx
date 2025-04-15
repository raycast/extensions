import { useState, useCallback, useEffect } from "react";
import { ChatEventType, ChatV3Message, type StreamChatData } from "@coze/api";
import { buildAssistantChatV3Message, buildUserChatV3Message } from "../services/utils";
import { useCachedPromise } from "@raycast/utils";
import { useRef } from "react";
import { APIInstance } from "../services/api";

export interface ChatParams {
  workspaceId: string;
  botId: string;
  query: string;
  filePath?: string;
}

export interface UseConversationResult {
  messages: ChatV3Message[];
  streamChat: (params: ChatParams) => Promise<void>;
  isLoading: boolean;
  error?: Error;
}

export function useConversation({
  conversationId,
  api,
  onError,
}: {
  conversationId?: string;
  api?: APIInstance;
  onError?: (error: Error) => void;
}): UseConversationResult {
  const [deltaInput, setDeltaInput] = useState<string | undefined>(undefined);
  const [deltaAnswer, setDeltaAnswer] = useState<string | undefined>(undefined);
  const [appendMessages, setAppendMessages] = useState<ChatV3Message[]>([]);
  const [error, setError] = useState<Error>();
  const abortable = useRef<AbortController>();

  const appendMessagesRef = useRef<ChatV3Message[]>([]);

  useEffect(() => {
    appendMessagesRef.current = appendMessages;
  }, [appendMessages]);

  const { isLoading, data: historyMessages } = useCachedPromise(
    async (cid: string) => {
      if (!api) return undefined;
      try {
        return await api.listMessages({
          conversation_id: cid,
          signal: abortable.current?.signal,
        });
      } catch (err) {
        const error = err as Error;
        setError(error);
        onError?.(error);
        return undefined;
      }
    },
    [conversationId || ""],
    {
      abortable,
      keepPreviousData: true,
      execute: !!conversationId && !!api,
    },
  );

  const streamChat = useCallback(
    async ({ workspaceId, botId, query, filePath }: ChatParams) => {
      if (!api || !workspaceId || !botId || !query || !conversationId) {
        return;
      }

      let delta = "";
      setDeltaInput(query);
      setDeltaAnswer("");
      setError(undefined);

      try {
        await api.streamChat({
          workspaceId,
          botId,
          query,
          filePath,
          conversationId,
          on_event: async (event: StreamChatData) => {
            if (!event) return;

            switch (event.event) {
              case ChatEventType.CONVERSATION_MESSAGE_DELTA:
                if (event.data.type === "answer") {
                  delta += event.data.content;
                  setDeltaAnswer(delta);
                }
                break;
              case ChatEventType.CONVERSATION_MESSAGE_COMPLETED:
                if (event.data.type === "answer") {
                  const newMessages = [
                    buildAssistantChatV3Message(conversationId, botId, event.data.content),
                    buildUserChatV3Message(conversationId, botId, query),
                  ];
                  setAppendMessages([...newMessages, ...appendMessagesRef.current]);
                  setDeltaAnswer(undefined);
                  setDeltaInput(undefined);
                }
                break;
            }
          },
        });
      } catch (err) {
        const error = err as Error;
        setError(error);
        onError?.(error);
      }
    },
    [api, conversationId, onError],
  );

  useEffect(() => {
    setAppendMessages([]);
    appendMessagesRef.current = [];
  }, [conversationId]);

  const answerList =
    deltaAnswer && deltaAnswer.length > 0 && conversationId
      ? [buildAssistantChatV3Message(conversationId, "", deltaAnswer)]
      : [];
  const inputList =
    deltaInput && deltaInput.length > 0 && conversationId
      ? [buildUserChatV3Message(conversationId, "", deltaInput)]
      : [];

  const buildMessage = (message: ChatV3Message) => {
    return `* ` + "`" + `${message.role}` + "`" + `: ${message.content}`;
  };

  const buildMessages = (messages: ChatV3Message[]) => {
    return messages.map(buildMessage).join("\n");
  };

  console.log(
    `[allMessages] answerList=${buildMessages(answerList)}, inputList=${buildMessages(inputList)}, appendMessages=${buildMessages(appendMessages)}, historyMessages=${buildMessages(historyMessages || [])}`,
  );

  const allMessages = [...answerList, ...inputList, ...appendMessages, ...(historyMessages || [])];

  return {
    messages: allMessages,
    streamChat,
    isLoading,
    error,
  };
}
