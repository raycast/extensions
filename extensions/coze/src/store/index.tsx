import { useLocalStorage } from "@raycast/utils";

export interface HistoryConversation {
  space_id: string;
  bot_id: string;
  conversation_id: string;
}

export const useConversations = () => {
  const { value: conversations, setValue: setConversations, isLoading } = useLocalStorage<HistoryConversation[]>("history_conversations", []);
  return { conversations, setConversations, isLoading };
}
