export type Set<T> = React.Dispatch<React.SetStateAction<T>>;

export interface Chat {
  id: string;
  question: string;
  answer: string;
  created_at: string;
  files: string[];
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
  pinned: boolean;
}

export interface Command {
  id: string;
  name: string;
  prompt: string;
  model: string;
  temperature: string;
  contentSource: "clipboard" | "selectedText" | "browserTab";
  isDisplayInput: boolean;
}

type FunctionNoArg = () => void;
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

export type ConversationsHook = Hook<Conversation> & {
  update: PromiseFunctionWithOneArg<Conversation>;
  setConversations: PromiseFunctionWithOneArg<Conversation[]>;
};

export type QuestionHook = BaseHook<string> & { update: PromiseFunctionWithOneArg<string> };

export type ModelHook = BaseHook<Record<string, Model>> &
  BaseFunctionHook<Model> & {
    setModels: PromiseFunctionWithOneArg<Record<string, Model>>;
    update: PromiseFunctionWithOneArg<Model>;
    option: Model["option"][];
    isFetching: boolean;
  };

export interface ChatHook {
  data: Chat[];
  errorMsg: string | null;
  setData: Set<Chat[]>;
  isLoading: boolean;
  isAborted: boolean;
  setLoading: Set<boolean>;
  selectedChatId: string | null;
  setSelectedChatId: Set<string | null>;
  ask: PromiseFunctionWithTwoArg<string, Model>;
  clear: PromiseFunctionNoArg;
  abort: FunctionNoArg;
  streamData: Chat | undefined;
}

export type CommandHook = BaseHook<Record<string, Command>> &
  BaseFunctionHook<Command> & {
    setCommand: PromiseFunctionWithOneArg<Record<string, Command>>;
    update: PromiseFunctionWithOneArg<Command>;
    clear: PromiseFunctionNoArg;
    isDefault: (id: string) => boolean;
  };

export interface ChangeModelProp {
  models: Model[];
  selectedModel: string;
  onModelChange: Set<string>;
}

export interface QuestionFormProps extends ChangeModelProp {
  initialQuestion: string;
  onSubmit: (question: string) => void;
  isFirstCall?: boolean;
}

export interface ChatViewProps extends ChangeModelProp {
  data: Chat[];
  question: string;
  isAutoSaveConversation: boolean;
  conversation: Conversation;
  setConversation: Set<Conversation>;
  use: { chats: ChatHook; conversations: ConversationsHook; savedChats: SavedChatHook };
}

export interface CSVPrompt {
  act: string;
  prompt: string;
}

export type ContentFormat = "html" | "text" | "markdown";
