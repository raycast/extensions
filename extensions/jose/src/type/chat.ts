import { v4 as uuidv4 } from "uuid";
import { BaseHookType, HookType, PromiseFunctionWithOneArgType, PromiseFunctionWithThreeArgType } from "./hook";
import { ConversationSelectedTypeAssistant, ConversationType, ConversationsHookType } from "./conversation";
import { PromiseFunctionNoArgType } from "./hook";
import { SetType } from "./base";
import { GetDevice, GetUserName } from "./config";
import { TalkAssistantType, TalkSnippetType, TalkType, TalkQuestionType } from "./talk";

export function GetNewChat(
  question: TalkQuestionType,
  conversation: ConversationType,
  assistant: TalkAssistantType,
  snippet: TalkSnippetType | undefined
): TalkType {
  return {
    chatId: uuidv4(),
    question: question,
    conversationId: conversation.conversationId,
    conversationType: ConversationSelectedTypeAssistant,
    assistant: assistant,
    snippet: snippet,
    userName: GetUserName(),
    device: GetDevice(),
    createdAt: new Date().toISOString(),
    streaming: false,
    result: undefined,
  };
}

export interface ChatHookType {
  data: TalkType[];
  setData: SetType<TalkType[]>;
  isLoading: boolean;
  setLoading: SetType<boolean>;
  selectedChatId: string | null;
  setSelectedChatId: SetType<string | null>;
  ask: PromiseFunctionWithThreeArgType<string, string[] | undefined, ConversationType>;
  clear: PromiseFunctionNoArgType;
  streamData: TalkType | undefined;
}

export interface ChatViewPropsType {
  data: TalkType[];
  question: string;
  conversation: ConversationType;
  setConversation: SetType<ConversationType>;
  use: { chats: ChatHookType; conversations: ConversationsHookType };
  selectedAssistant: TalkAssistantType;
}

export interface ChangeModelPropType {
  assistants: TalkAssistantType[];
  selectedAssistant: TalkAssistantType;
  onAssistantChange: SetType<TalkAssistantType>;
}

export interface CreateChatCompletionDeltaResponseType {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: [
    {
      delta: {
        role: "user" | "assistant" | "system";
        content?: string;
      };
      index: number;
      finish_reason: string | null;
    }
  ];
}

export type QuestionHookType = BaseHookType<string> & { update: PromiseFunctionWithOneArgType<string> };

export interface ChatFullFormPropsType {
  initialQuestion: string;
  onSubmit: (question: string, file: string[] | undefined) => void;
}

export type HistoryHookType = HookType<TalkType>;

export interface ChangeDropdownPropType {
  assistants: TalkAssistantType[];
  snippets: TalkSnippetType[];
  selectedAssistant: TalkAssistantType;
  onAssistantChange: SetType<TalkAssistantType>;
  onSnippetChange: SetType<TalkSnippetType | undefined>;
}
