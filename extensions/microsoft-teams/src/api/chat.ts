import { bodyOf, get } from "./api";

interface Chats {
  value: Chat[];
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

async function listChats(filter: string) {
  const response = await get({
    path: "/me/chats",
    queryParams: {
      $filter: filter,
      $expand: "members,lastMessagePreview",
      $orderBy: "lastMessagePreview/createdDateTime desc",
      $top: "50",
    },
  });
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
  const chats = await listChats(filter);
  return chats.value;
}
