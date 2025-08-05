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
type Role = "system" | "user" | "assistant";

export type Message = {
  role: Role;
  content: string;
  name?: string;
};

export interface ChatHook {
  data: Chat[];
  setData: Set<Chat[]>;
  isLoading: boolean;
  setLoading: Set<boolean>;
  selectedChatId: string | null;
  setSelectedChatId: Set<string | null>;
  ask: PromiseFunctionWithTwoArg<string, TemplateModel>;
  clear: PromiseFunctionNoArg;
}

export interface TemplateModel {
  id: number;
  avatar: string;
  content: string; // prompt
  create_time: string;
  description: string;
  is_context: boolean;
  priority: number;
  tags: string[];
  temperature: number;
  template_id: number;
  template_name: string; // name
  type: number;
  update_time: string;
  user_id: number;
}

export type ModelTemplateHook = Hook<TemplateModel> & {
  update: PromiseFunctionWithOneArg<TemplateModel>;
};

export interface ChangeTemplateModelProp {
  templateModels: TemplateModel[];
  selectedTemplateModelId: TemplateModel["template_id"];
  onTemplateModelChange: Set<TemplateModel["template_id"]>;
}

export interface DrawQuestion {
  id: string;
  question: string;
  created_at: string;
  n: 1 | 2 | 3 | 4;
  size: DrawQuestionOpsSize;
}

export interface GetImagesOps {
  n?: number;
  prompt: string;
  size?: DrawQuestionOpsSize;
}

export type DrawQuestionOpsSize = "512x512" | "1024x1024" | "256x256";

export interface DrawChat extends DrawQuestion {
  answer: Array<{ url: string }>;
}
export interface DrawHook {
  data: DrawChat[];
  setData: Set<DrawChat[]>;
  isLoading: boolean;
  setLoading: Set<boolean>;
  // selectedChatId: string | null;
  // setSelectedChatId: Set<string | null>;
  ask: PromiseFunctionWithOneArg<string>;
  clear: PromiseFunctionNoArg;
}
export interface Conversation {
  id: string;
  chats: Chat[];
  model: TemplateModel;
  updated_at: string;
  created_at: string;
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

export interface ChatParams {
  data: {
    messages: Array<{
      role: Role;
      content: string;
    }>;
    templateId: string | number;
    templateName: string;
    temperature: number;
    systemPrompt: string;
    model?: "gpt-3.5-turbo";
    clientType?: 4;
  };
  token: string;
  onMessage: (data: any) => void;
  onClose: () => void;
  onError: (err: any) => void;
}

export interface QuestionFormProps extends ChangeTemplateModelProp {
  initialQuestion: string;
  onSubmit: (question: string) => void;
}

export interface ChatViewProps extends ChangeTemplateModelProp {
  data: Chat[];
  question: string;
  isAutoSaveConversation: boolean;
  conversation: Conversation;
  setConversation: Set<Conversation>;
  use: { chats: ChatHook; conversations: ConversationsHook; savedChats: SavedChatHook };
}

export interface TemplateBaseOps {
  id: number;
  name: string;
  type: 1 | 2 | 3; // 官方仓库 | 我的 | 社区
  description: string;
  content: string;
  tags: string[];
  avatar: string;
  is_pub: boolean;
  hot_index: number;
  sample: string;
}

export interface TemplateBase extends TemplateBaseOps {
  owner_id: number;
  temperature: number;
  create_time: string;
  update_time: string;
}

export interface TemplateFavorite {
  id: number;
  user_id: number;
  template_name: string;
  chat_q: string;
  chat_a: string;
  create_time: string;
}

export interface UserInfo {
  userId: number;
  email: string;
  createTime: string;
}
