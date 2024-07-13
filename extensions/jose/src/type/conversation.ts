import { v4 as uuidv4 } from "uuid";
import { HookType, PromiseFunctionWithOneArgType } from "./hook";
import { GetDevice, GetUserName } from "./config";
import { ConversationSelectedTypeAssistant, ITalk, ITalkAssistant, ITalkSnippet } from "../ai/type";

export function GetNewConversation(assistant: ITalkAssistant, cleared: boolean): ConversationType {
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
  assistant: ITalkAssistant;
  snippet: ITalkSnippet | undefined;
  userName: string;
  device: string;
  updatedAt: string;
  createdAt: string;
  chats: ITalk[];
  cleared: boolean;
}

export type ConversationsHookType = HookType<ConversationType> & {
  update: PromiseFunctionWithOneArgType<ConversationType>;
};
