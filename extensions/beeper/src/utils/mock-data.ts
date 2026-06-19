import BeeperDesktop from "@beeper/desktop-api";
import { BeeperAccount } from "./types";

export interface MockChatItem {
  id: string;
  name: string;
  type: "single" | "group" | "space";
  service: string;
  networkRaw: string;
  accountId: string;
  lastMessageAt?: string;
  unreadCount?: number;
  isMuted?: boolean;
  isArchived?: boolean;
}

export const MOCK_CHATS: MockChatItem[] = [
  {
    id: "mock-chat-1",
    name: "Sarah Chen",
    type: "single",
    service: "whatsapp",
    networkRaw: "whatsapp",
    accountId: "whatsapp-1",
    lastMessageAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    unreadCount: 3,
  },
  {
    id: "mock-chat-2",
    name: "Family Group",
    type: "group",
    service: "whatsapp",
    networkRaw: "whatsapp",
    accountId: "whatsapp-1",
    lastMessageAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    unreadCount: 12,
  },
  {
    id: "mock-chat-3",
    name: "Alex Rivera",
    type: "single",
    service: "telegram",
    networkRaw: "telegram",
    accountId: "telegram-1",
    lastMessageAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    isMuted: true,
  },
  {
    id: "mock-chat-4",
    name: "Design Team",
    type: "group",
    service: "slack",
    networkRaw: "slack",
    accountId: "slack-1",
    lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    unreadCount: 5,
  },
  {
    id: "mock-chat-5",
    name: "Mom",
    type: "single",
    service: "imessage",
    networkRaw: "imessage",
    accountId: "imessage-1",
    lastMessageAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "mock-chat-6",
    name: "Jordan Taylor",
    type: "single",
    service: "signal",
    networkRaw: "signal",
    accountId: "signal-1",
    lastMessageAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    unreadCount: 1,
  },
];

export const MOCK_ACCOUNTS: BeeperAccount[] = [
  { id: "whatsapp-1", service: "whatsapp", displayName: "Sarah Chen", isConnected: true, username: "+1 555 123 4567" },
  { id: "telegram-1", service: "telegram", displayName: "Alex Rivera", isConnected: true, username: "@alex_r" },
  { id: "imessage-1", service: "imessage", displayName: "Mom", isConnected: true, username: "mom@icloud.com" },
  { id: "slack-1", service: "slack", displayName: "Work", isConnected: true, username: "you@company.com" },
  { id: "signal-1", service: "signal", displayName: "Jordan Taylor", isConnected: true, username: "+1 555 987 6543" },
  { id: "discord-1", service: "discord", displayName: "Gaming", isConnected: true, username: "gamer#1234" },
];

export interface MockMessageResult {
  id: string;
  text: string;
  senderName: string;
  chatId: string;
  accountId: string;
  timestamp: string;
  service: string;
  isSender: boolean;
  isUnread?: boolean;
}

export const MOCK_MESSAGES: MockMessageResult[] = [
  {
    id: "mock-msg-1",
    text: "Hey! Are we still on for dinner tomorrow? I found a great new place downtown.",
    senderName: "Sarah Chen",
    chatId: "mock-chat-1",
    accountId: "whatsapp-1",
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    service: "whatsapp",
    isSender: false,
    isUnread: true,
  },
  {
    id: "mock-msg-2",
    text: "Yes! 7pm works perfectly. Can't wait to try it.",
    senderName: "You",
    chatId: "mock-chat-1",
    accountId: "whatsapp-1",
    timestamp: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
    service: "whatsapp",
    isSender: true,
  },
  {
    id: "mock-msg-3",
    text: "Don't forget the design review is at 3pm today. I'll share the Figma link in the channel.",
    senderName: "Alex Rivera",
    chatId: "mock-chat-4",
    accountId: "slack-1",
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    service: "slack",
    isSender: false,
    isUnread: true,
  },
  {
    id: "mock-msg-4",
    text: "Thanks for the heads up! I'll be there.",
    senderName: "You",
    chatId: "mock-chat-4",
    accountId: "slack-1",
    timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    service: "slack",
    isSender: true,
  },
  {
    id: "mock-msg-5",
    text: "Happy birthday! Hope you have an amazing day!",
    senderName: "Mom",
    chatId: "mock-chat-5",
    accountId: "imessage-1",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    service: "imessage",
    isSender: false,
  },
];

/** Convert MockChatItem to BeeperDesktop.Chat for view components */
export function mockChatToBeeperChat(item: MockChatItem): BeeperDesktop.Chat {
  return {
    id: item.id,
    accountID: item.accountId,
    participants: { hasMore: false, items: [], total: 0 },
    type: item.type === "space" ? "group" : item.type,
    unreadCount: item.unreadCount ?? 0,
    isArchived: item.isArchived ?? false,
    isMuted: item.isMuted ?? false,
    isPinned: false,
    lastActivity: item.lastMessageAt ?? undefined,
    title: item.name,
    localChatID: null,
  };
}

/** Convert MockMessageResult to BeeperDesktop.Message for view components */
export function mockMessageToBeeperMessage(msg: MockMessageResult): BeeperDesktop.Message {
  return {
    id: msg.id,
    accountID: msg.accountId,
    chatID: msg.chatId,
    senderID: msg.senderName,
    sortKey: msg.timestamp,
    text: msg.text,
    senderName: msg.senderName,
    timestamp: msg.timestamp,
    isSender: msg.isSender,
  };
}

/** Mock contacts derived from chat participants for Contacts view */
export const MOCK_CONTACTS: Array<BeeperDesktop.User & { accountID?: string }> = [
  { id: "mock-user-1", fullName: "Sarah Chen", username: "+1 555 123 4567", accountID: "whatsapp-1", isSelf: false },
  { id: "mock-user-2", fullName: "Alex Rivera", username: "@alex_r", accountID: "telegram-1", isSelf: false },
  { id: "mock-user-3", fullName: "Mom", username: "mom@icloud.com", accountID: "imessage-1", isSelf: false },
  { id: "mock-user-4", fullName: "Jordan Taylor", username: "+1 555 987 6543", accountID: "signal-1", isSelf: false },
  { id: "mock-user-5", fullName: "Design Team", username: "design-team", accountID: "slack-1", isSelf: false },
  { id: "mock-user-6", fullName: "Family Group", username: "family", accountID: "whatsapp-1", isSelf: false },
];
