import { bodyOf, failIfNotOk, get } from "./api";
import { currentUserId } from "./user";

interface Chats {
  value: Chat[];
}

interface ChatMessages {
  value: ChatMessage[];
}

export interface Chat {
  id: string;
  topic?: string;
  chatType: "oneOnOne" | "group" | "meeting";
  createdDateTime: string;
  webUrl: string;
  members: ChatMember[] | null;
  lastMessagePreview: MessagePreview | null;
}

interface ChatMember {
  id: string;
  displayName: string;
  userId: string;
  email: string;
}

interface MessagePreview {
  id: string;
  createdDateTime: string;
  isDeleted: boolean;
  messageType: "message" | "systemEventMessage";
  body: {
    contentType: "text" | "html";
    content: string;
  };
  from: {
    application: {
      id: string;
      displayName: string;
    } | null;
    user: {
      id: string;
      displayName: string;
    } | null;
  };
}

export interface ChatMessage {
  id: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  messageType: "message" | "systemEventMessage" | "unknownFutureValue";
  subject?: string;
  body: {
    contentType: "text" | "html";
    content: string;
  };
  from: {
    application?: {
      id: string;
      displayName: string;
    } | null;
    user?: {
      id: string;
      displayName: string;
    } | null;
  } | null;
  webUrl?: string;
}

async function listChats(options?: { filter?: string; maxResults?: number }) {
  const maxResults = Math.max(1, Math.min(options?.maxResults ?? 50, 50));
  const response = await get({
    path: "/me/chats",
    queryParams: {
      ...(options?.filter ? { $filter: options.filter } : {}),
      $expand: "members,lastMessagePreview",
      $orderBy: "lastMessagePreview/createdDateTime desc",
      $top: String(maxResults),
    },
  });
  await failIfNotOk(response, "Getting chats");
  return bodyOf<Chats>(response);
}

export async function findChats(query: string) {
  const filterTopic = (str: string) => `contains(tolower(topic),tolower('${str}'))`;
  const filterMembers = (str: string) => `members/any(m:contains(tolower(m/displayName), tolower('${str}')))`;
  const filterBot = (str: string) =>
    `contains(tolower(lastMessagePreview/from/application/displayName), tolower('${str}'))`;
  const filterTopicOrMembers = (str: string) => `(${filterTopic(str)} or ${filterMembers(str)} or ${filterBot(str)})`;
  const escapedQuery = query.replaceAll("'", "''");
  const filter = escapedQuery
    .trim()
    .split(" ")
    .map((q) => filterTopicOrMembers(q))
    .join(" and ");
  const chats = await listChats({ filter });
  return chats.value;
}

export async function getRecentChats(maxResults = 10) {
  const chats = await listChats({ maxResults });
  return chats.value;
}

export async function getChatMessages(chatId: string, maxResults = 20) {
  const normalizedChatId = chatId.trim();
  if (!normalizedChatId) {
    throw new Error("A chat ID is required");
  }

  const response = await get({
    path: `/chats/${encodeURIComponent(normalizedChatId)}/messages`,
    queryParams: {
      $top: String(Math.max(1, Math.min(maxResults, 50))),
      $orderby: "createdDateTime desc",
    },
  });
  await failIfNotOk(response, "Getting chat messages");
  const messages = await bodyOf<ChatMessages>(response);
  return messages.value;
}

export function chatMemberNames(chat: Chat) {
  const meId = currentUserId();
  return chat.members?.filter((member) => member.userId !== meId).map((member) => member.displayName) ?? [];
}

export function chatMemberAddresses(chat: Chat) {
  const meId = currentUserId();
  return (
    chat.members
      ?.filter((member) => member.userId !== meId)
      .map((member) => member.email)
      .filter(Boolean) ?? []
  );
}

export function chatTitle(chat: Chat) {
  if (chat.topic) {
    return chat.topic;
  }

  const memberNames = chatMemberNames(chat);
  if (memberNames.length > 0) {
    return memberNames.join(", ");
  }

  const sender = chat.lastMessagePreview?.from;
  return sender?.application?.displayName ?? sender?.user?.displayName ?? "Unknown";
}
