export interface Preferences {
  apiId: string;
  apiHash: string;
  phoneNumber: string;
  password2FA?: string;
}

export interface Chat {
  id: string;
  title: string;
  type: "Private" | "Group" | "Channel";
  unreadCount?: number;
  lastMessage?: string;
  description?: string;
  username?: string;
}

export interface TelegramConfig {
  apiId: number;
  apiHash: string;
}

export const SESSION_KEY = "telegram-session-v1" as const;