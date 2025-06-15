import OpenAI from "openai";

export type Set<T> = React.Dispatch<React.SetStateAction<T>>;

export type Message = OpenAI.ChatCompletionMessageParam;

export interface Question {
  id: string;
  question: string;
  files: string[];
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
  pinned: boolean;
  vision?: boolean;
}

export type CommandContentSource = "clipboard" | "selectedText" | "browserTab";

export interface Command {
  id: string;
  name: string;
  prompt: string;
  model: string;
  temperature: string;
  contentSource: CommandContentSource;
  isDisplayInput: boolean;
}

type FunctionNoArg = () => void;
type PromiseFunctionNoArg = () => Promise<void>;
type PromiseFunctionWithOneArg<T> = (arg: T) => Promise<void>;
// type PromiseFunctionWithTwoArg<T, V> = (arg_1: T, arg_2: V) => Promise<void>;
type PromiseFunctionWithThreeArg<T, V, W> = (arg_1: T, arg_2: V, arg_3: W) => Promise<void>;

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
  ask: PromiseFunctionWithThreeArg<string, string[], Model>;
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
  onSubmit: (question: string, files: string[]) => void;
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

export type AskImageProps = {
  user_prompt: string;
  load: "clipboard" | "selected";
  selected_text?: string; // If defined, uses this as selected text
  user_extra_msg?: string; // Textfield in Form -> If not empty, appends this to the user message
  model_override?: string;
  toast_title: string;
  temperature?: number;
  content_format?: ContentFormat;
};
