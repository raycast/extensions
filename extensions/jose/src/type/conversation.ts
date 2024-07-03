import { v4 as uuidv4 } from "uuid";
import { HookType, PromiseFunctionWithOneArgType } from "./hook";
import { GetDevice, GetUserName } from "./config";
import { TalkAssistantType, TalkSnippetType, TalkType } from "./talk";

export const ConversationSelectedTypeAssistant = "assistant";
export const ConversationSelectedTypeSnippet = "snippet";

export function GetNewConversation(assistant: TalkAssistantType, cleared: boolean): ConversationType {
  return {
    conversationId: uuidv4(),
    selectedType: ConversationSelectedTypeAssistant,
    assistant: assistant,
    snippet: undefined,
    userName: GetUserName(),
    device: GetDevice(),
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    chats: [],
    cleared: cleared,
  };
}

export interface ConversationType {
  conversationId: string;
  selectedType: string;
  assistant: TalkAssistantType;
  snippet: TalkSnippetType | undefined;
  userName: string;
  device: string;
  updatedAt: string;
  createdAt: string;
  chats: TalkType[];
  cleared: boolean;
}

export type ConversationsHookType = HookType<ConversationType> & {
  update: PromiseFunctionWithOneArgType<ConversationType>;
};
