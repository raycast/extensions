export type Set<T> = React.Dispatch<React.SetStateAction<T>>;

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

export enum PromptType {
  SelectedTextInstantAction,
}

export interface PromptPrimitive {
  name: string;
  temperature: string;
  system_prompt: string;
}

export enum ApiType {
  gemini = "gemini",
  openai = "openai",
}

export interface ApiSpecs {
  model: string;
  endpoint: string;
  type: ApiType;
  key: string;
}

export interface Prompt extends PromptPrimitive {
  id: string;
  type: PromptType;
  last_used_100ms_epoch: number;
  option: string;
}

export interface SavedChatHook {
  data: SavedChat[];
  isLoading: boolean;
  add: (chat: SavedChat) => Promise<void>;
  remove: (chat: SavedChat) => Promise<void>;
  clear: () => Promise<void>;
}

export interface ConversationsHook {
  data: Conversation[];
  isLoading: boolean;
  add: (conversation: Conversation) => Promise<void>;
  remove: (conversation: Conversation) => Promise<void>;
  clear: () => Promise<void>;
  update: (conversation: Conversation) => Promise<void>;
}

export interface QuestionHook {
  data: string;
  isLoading: boolean;
  update: (question: string) => Promise<void>;
}

export interface PromptHook {
  data: Prompt[];
  isLoading: boolean;
  add: (prompt: Prompt) => Promise<void>;
  remove: (prompt: Prompt) => Promise<void>;
  clear: () => Promise<void>;
  update: (prompt: Prompt) => Promise<void>;
  option: Prompt["option"][];
}

export interface ChatHook {
  data: Chat[];
  setData: Set<Chat[]>;
  isLoading: boolean;
  setLoading: Set<boolean>;
  selectedChatId: string | null;
  setSelectedChatId: Set<string | null>;
  ask: (question: string, prompt: Prompt) => Promise<void>;
  clear: () => Promise<void>;
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

export interface ChatViewProps {
  data: Chat[];
  question: string;
  conversation: Conversation;
  setConversation: Set<Conversation>;
  use: {
    chats: ChatHook;
    conversations: ConversationsHook;
    savedChats: SavedChatHook;
  };
}

export interface ConfigurationPreferences {
  apiType: ApiType;
  apiKey: string;
  apiEndpoint: string;
  defaultModel: string;
}

export interface CSVPrompt {
  act: string;
  prompt: string;
}

export interface ApiArgs {
  prompt: string;
  temperature: number;
  model: string;
}

export type tokenStream = (ApiArgs) => AsyncGenerator<string, void, unknown>;
