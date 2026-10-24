export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  tokens?: number;
  imagePath?: string;
  interruptedReason?: string;
  interruptedExplanation?: string;
  createdAt: string;
}

export interface Chat {
  id: string;
  title: string;
  instructions: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatStore {
  version: 1;
  chats: Chat[];
}

export const CHAT_STORE_VERSION = 1;
export const CHATS_STORAGE_KEY = "chats";
export const CHATS_BACKUP_KEY = "chats.corrupt-backup";
