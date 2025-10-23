import { LocalStorage } from "@raycast/api";

export interface CustomChat {
  id: string;
  name: string;
  chatId?: string;
  webhookUrl?: string;
  type: "group" | "personal" | "webhook";
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CUSTOM_CHATS_KEY = "custom_chats";

export class CustomChatManager {
  static async getCustomChats(): Promise<CustomChat[]> {
    try {
      const stored = await LocalStorage.getItem<string>(CUSTOM_CHATS_KEY);
      if (!stored) return [];

      const chats = JSON.parse(stored) as CustomChat[];
      return chats.map((chat) => ({
        ...chat,
        createdAt: new Date(chat.createdAt),
        updatedAt: new Date(chat.updatedAt),
      }));
    } catch (error) {
      console.error("Failed to load custom chats:", error);
      return [];
    }
  }

  static async saveCustomChat(
    chat: Omit<CustomChat, "id" | "createdAt" | "updatedAt">
  ): Promise<CustomChat> {
    const chats = await this.getCustomChats();

    const newChat: CustomChat = {
      ...chat,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    chats.push(newChat);
    await this.saveChats(chats);
    return newChat;
  }

  static async updateCustomChat(
    id: string,
    updates: Partial<Omit<CustomChat, "id" | "createdAt">>
  ): Promise<CustomChat | null> {
    const chats = await this.getCustomChats();
    const index = chats.findIndex((chat) => chat.id === id);

    if (index === -1) return null;

    const updatedChat = {
      ...chats[index],
      ...updates,
      updatedAt: new Date(),
    };

    chats[index] = updatedChat;
    await this.saveChats(chats);
    return updatedChat;
  }

  static async deleteCustomChat(id: string): Promise<boolean> {
    const chats = await this.getCustomChats();
    const filteredChats = chats.filter((chat) => chat.id !== id);

    if (filteredChats.length === chats.length) return false;

    await this.saveChats(filteredChats);
    return true;
  }

  private static async saveChats(chats: CustomChat[]): Promise<void> {
    await LocalStorage.setItem(CUSTOM_CHATS_KEY, JSON.stringify(chats));
  }

  private static generateId(): string {
    return `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static async clearAllCustomChats(): Promise<void> {
    await LocalStorage.removeItem(CUSTOM_CHATS_KEY);
  }
}

// Helper function to validate chat configuration
export function validateCustomChat(chat: Partial<CustomChat>): string[] {
  const errors: string[] = [];

  if (!chat.name || chat.name.trim().length === 0) {
    errors.push("チャット名は必須です");
  }

  if (!chat.type) {
    errors.push("チャットタイプは必須です");
  }

  if (chat.type === "webhook") {
    if (!chat.webhookUrl || chat.webhookUrl.trim().length === 0) {
      errors.push("Webhook URLは必須です");
    } else if (!isValidUrl(chat.webhookUrl)) {
      errors.push("有効なWebhook URLを入力してください");
    }
  } else {
    if (!chat.chatId || chat.chatId.trim().length === 0) {
      errors.push("チャットIDは必須です");
    }
  }

  return errors;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
