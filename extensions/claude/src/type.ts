export type Set<T> = React.Dispatch<React.SetStateAction<T>>;

export type Message = {
  role: "user" | "assistant";
  content: string;
};

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
  model: Model;
  chats: Chat[];
  updated_at: string;
  created_at: string;
  pinned: boolean;
}

export interface Model {
  id: string;
  updated_at: string;
  created_at: string;
  name: string;
  prompt: string;
  option: string;
  temperature: string;
  max_tokens: string;
  pinned: boolean;
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

export type HistoryHook = Hook<Chat>;

export type SavedChatHook = Hook<SavedChat>;

export type ConversationsHook = Hook<Conversation> & { update: PromiseFunctionWithOneArg<Conversation> };

export type QuestionHook = BaseHook<string> & { update: PromiseFunctionWithOneArg<string> };

export type ModelHook = Hook<Model> & {
  update: PromiseFunctionWithOneArg<Model>;
  option: Model["option"][];
};

export interface ChatHook {
  data: Chat[];
  setData: Set<Chat[]>;
  isLoading: boolean;
  setLoading: Set<boolean>;
  selectedChatId: string | null;
  setSelectedChatId: Set<string | null>;
  ask: PromiseFunctionWithTwoArg<string, Model>;
  clear: PromiseFunctionNoArg;
  streamData: Chat | undefined;
}

export interface ChangeModelProp {
  models: Model[];
  selectedModel: string;
  onModelChange: Set<string>;
}

export interface QuestionFormProps extends ChangeModelProp {
  initialQuestion: string;
  onSubmit: (question: string) => void;
}

export interface ChatViewProps extends ChangeModelProp {
  data: Chat[];
  question: string;
  model: Model;
  setConversation: Set<Conversation>;
  use: { chats: ChatHook };
}

export interface CSVPrompt {
  name: string;
  prompt: string;
}
