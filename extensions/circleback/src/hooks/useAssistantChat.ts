import { useChat } from "@ai-sdk/react";
import { usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import {
  askAssistant,
  fetchAssistantChats,
  getAssistantChat,
  getChatSources,
  loadSavedMessages,
} from "../utils/assistant/chat";
import { reportErrors } from "../utils/error";

const fetchChats = reportErrors(fetchAssistantChats);
const loadMessages = reportErrors(loadSavedMessages);

export const useAssistantChat = (initialQuestion?: string) => {
  const [newChatId] = useState(() => crypto.randomUUID());
  const [selectedChatId, setSelectedChatId] = useState<string>();
  const { data: savedChats = [], isLoading: isLoadingChats } = usePromise(fetchChats);
  const chats =
    initialQuestion === undefined
      ? savedChats
      : [
          { id: newChatId, name: initialQuestion, updatedAt: new Date() },
          ...savedChats.filter(({ id }) => id !== newChatId),
        ];
  const chatId = selectedChatId ?? chats[0]?.id ?? newChatId;
  const chat = getAssistantChat(chatId);
  const { messages, status } = useChat({ chat, experimental_throttle: 50 });
  const { isLoading: isLoadingMessages, error: loadMessagesError } = usePromise(loadMessages, [chat], {
    execute: chatId !== newChatId,
    failureToastOptions: { title: "Could not load the chat." },
  });
  const hasAskedInitialQuestion = useRef(false);

  // sendMessage is async, so the chat can't tell the question was already asked.
  useEffect(() => {
    if (initialQuestion === undefined || hasAskedInitialQuestion.current) return;
    hasAskedInitialQuestion.current = true;
    askAssistant(getAssistantChat(newChatId), initialQuestion);
  }, [initialQuestion, newChatId]);

  return {
    chats,
    chatId,
    selectChat: setSelectedChatId,
    messages,
    sources: getChatSources(chatId),
    isAnswering: status === "submitted" || status === "streaming",
    isLoading: isLoadingChats || isLoadingMessages,
    // Without the saved history, the server would treat a follow-up as an edit
    // of the first question and delete the rest of the chat.
    hasLoadError: chatId !== newChatId && loadMessagesError !== undefined,
    ask: (question: string) => askAssistant(chat, question),
  };
};
