import { v4 as uuidv4 } from "uuid";
import { BaseHookType, HookType, PromiseFunctionWithOneArgType, PromiseFunctionWithThreeArgType } from "./hook";
import { ConversationType, ConversationsHookType } from "./conversation";
import { PromiseFunctionNoArgType } from "./hook";
import { SetType } from "./base";
import { GetDevice, GetUserName } from "./config";
import {
  ConversationSelectedTypeAssistant,
  EMessage_role,
  ITalk,
  ITalkAssistant,
  ITalkHistory,
  ITalkQuestion,
  ITalkSnippet,
} from "../ai/type";

export function GetNewChat(
  question: ITalkQuestion,
  conversation: ConversationType,
  assistant: ITalkAssistant,
  snippet: ITalkSnippet | undefined
): ITalk {
  const history: ITalkHistory[] = [];
  for (const c of conversation.chats) {
    history.push({
      role: EMessage_role.USER,
      content: c.conversation.question.content,
    });
    if (c.result) {
      history.push({
        role: EMessage_role.AI,
        content: c.result?.content,
      });
    }
  }

  return {
    id: uuidv4(),
    llm: {
      llm: undefined,
      model: undefined,
      url: undefined,
      temperature: undefined,
      object: undefined,
      stream: false,
    },
    user: {
      id: GetUserName(),
      name: GetUserName(),
      email: undefined,
    },
    device: {
      name: GetDevice(),
    },
    conversation: {
      id: conversation.conversationId,
      type: ConversationSelectedTypeAssistant,
      system: undefined,
      question: question,
      history: history,
    },
    assistant: {
      id: assistant.assistantId,
      object: assistant,
    },
    snippet: {
      id: snippet?.snippetId || undefined,
      object: snippet,
    },
    createdAt: new Date().toISOString(),
    result: undefined,
  };
}

export interface ChatHookType {
  data: ITalk[];
  setData: SetType<ITalk[]>;
  isLoading: boolean;
  setLoading: SetType<boolean>;
  selectedChatId: string | null;
  setSelectedChatId: SetType<string | null>;
  ask: PromiseFunctionWithThreeArgType<string, string[] | undefined, ConversationType>;
  clear: PromiseFunctionNoArgType;
  streamData: ITalk | undefined;
}

export interface ChatViewPropsType {
  data: ITalk[];
  question: string;
  conversation: ConversationType;
  setConversation: SetType<ConversationType>;
  use: { chats: ChatHookType; conversations: ConversationsHookType };
  selectedAssistant: ITalkAssistant;
}

export interface ChangeModelPropType {
  assistants: ITalkAssistant[];
  selectedAssistant: ITalkAssistant;
  onAssistantChange: SetType<ITalkAssistant>;
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

export type HistoryHookType = HookType<ITalk>;

export interface ChangeDropdownPropType {
  assistants: ITalkAssistant[];
  snippets: ITalkSnippet[];
  selectedAssistant: ITalkAssistant | undefined;
  onAssistantChange: SetType<ITalkAssistant>;
  onSnippetChange: SetType<ITalkSnippet | undefined>;
}
