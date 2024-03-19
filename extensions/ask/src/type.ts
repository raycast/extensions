import OpenAI from "openai";
import ChatCompletionMessageParam = OpenAI.ChatCompletionMessageParam;

export type Set<T> = React.Dispatch<React.SetStateAction<T>>;

export type Message = ChatCompletionMessageParam;

export interface Question {
  id: string;
  question: string;
  created_at: string;
}

export interface Chat extends Question {
  answer: string;
}

export interface SavedChat extends Chat {
  saved_at?: string;
}

export interface Conversation {
  id: string;
  prompt: Prompt;
  chats: Chat[];
  updated_at: string;
  created_at: string;
}

export interface Prompt {
  id: string;
  updated_at: string;
  created_at: string;
  name: string;
  prompt: string;
  apiEndpoint: string;
  apiEndpointName: string;
  option: string;
  temperature: string;
}

type PromiseFunctionNoArg = () => Promise<void>;
type PromiseFunctionWithOneArg<T> = (arg: T) => Promise<void>;
type PromiseFunctionWithTwoArg<T, V> = (arg_1: T, arg_2: V) => Promise<void>;

interface BaseFunctionHook<T> {
  add: PromiseFunctionWithOneArg<T>;
  remove: PromiseFunctionWithOneArg<T>;
  clear: PromiseFunctionNoArg;
}

interface BaseHook<T> {
  data: T;
  isLoading: boolean;
}

type Hook<T> = BaseHook<T[]> & BaseFunctionHook<T>;

export type SavedChatHook = Hook<SavedChat>;

export type ConversationsHook = Hook<Conversation> & { update: PromiseFunctionWithOneArg<Conversation> };

export type QuestionHook = BaseHook<string> & { update: PromiseFunctionWithOneArg<string> };

export type PromptHook = Hook<Prompt> & {
  update: PromiseFunctionWithOneArg<Prompt>;
  option: Prompt["option"][];
  isFetching: boolean;
};

export interface ChatHook {
  data: Chat[];
  setData: Set<Chat[]>;
  isLoading: boolean;
  setLoading: Set<boolean>;
  selectedChatId: string | null;
  setSelectedChatId: Set<string | null>;
  ask: PromiseFunctionWithTwoArg<string, Prompt>;
  clear: PromiseFunctionNoArg;
  streamData: Chat | undefined;
}

export interface ChangePromptProp {
  prompts: Prompt[];
  selectedPrompt: Prompt;
  onPromptChange: Set<Prompt>;
}

export interface QuestionFormProps extends ChangePromptProp {
  initialQuestion: string;
  onSubmit: (question: string) => void;
}

export interface ChatViewProps extends ChangePromptProp {
  data: Chat[];
  question: string;
  isAutoSaveConversation: boolean;
  conversation: Conversation;
  setConversation: Set<Conversation>;
  use: { chats: ChatHook; conversations: ConversationsHook; savedChats: SavedChatHook };
}

export interface ConfigurationPreferences {
  apiKey: string;
  apiEndpoint: string;
}

export interface CSVPrompt {
  act: string;
  prompt: string;
}
