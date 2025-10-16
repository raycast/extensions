import { LocalStorage } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";

export type Conversation = {
  id: string;
  title: string;
  date: string;
  chats: {
    question: string;
    answer: string;
  }[];
};

const storageKey = "mistral-conversations";

export function useConversations() {
  return useLocalStorage<Conversation[]>(storageKey);
}

export async function getConversations(): Promise<Conversation[]> {
  const conversations = await LocalStorage.getItem(storageKey);
  return conversations ? JSON.parse(conversations as string) : [];
}

export async function setConversations(conversations: Conversation[]) {
  await LocalStorage.setItem(storageKey, JSON.stringify(conversations));
}
