export interface Preferences {
  apiId: string;
  apiHash: string;
  phoneNumber: string;
}

export interface Chat {
  id: number;
  title: string;
  type: string;
  unreadCount?: number;
  lastMessage?: string;
}

export const SESSION_KEY = "telegram-session-v1" as const;