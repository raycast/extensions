export interface FindChatsResponse {
  object: "list";
  data: ChatSummary[];
}

export type ChatPrivacy = "public" | "private" | "team" | "team-edit" | "unlisted";

export interface ChatSummary {
  id: string;
  object: "chat";
  shareable: boolean;
  privacy: ChatPrivacy;
  name?: string;
  updatedAt?: string;
  favorite: boolean;
  authorId: string;
  projectId?: string;
  latestVersion?: VersionDetail;
}

export interface VersionFile {
  object: "file";
  name: string;
  content: string;
}

export interface VersionDetail {
  id: string;
  object: "version";
  status: "pending" | "completed" | "failed";
  demoUrl?: string;
  files?: VersionFile[];
}

export interface MessageSummary {
  id: string;
  object: "message";
  content: string;
  createdAt: string;
  updatedAt?: string;
  type:
    | "message"
    | "forked-block"
    | "forked-chat"
    | "open-in-v0"
    | "refinement"
    | "added-environment-variables"
    | "added-integration"
    | "deleted-file"
    | "moved-file"
    | "renamed-file"
    | "edited-file"
    | "replace-src"
    | "reverted-block"
    | "fix-with-v0"
    | "auto-fix-with-v0"
    | "sync-git";
  role: "user" | "assistant";
  finishReason?: "stop" | "length" | "content-filter" | "tool-calls" | "error" | "other" | "unknown";
}

export interface ChatDetailResponse {
  id: string;
  object: "chat";
  shareable: boolean;
  privacy: ChatPrivacy;
  name?: string;
  updatedAt?: string;
  favorite: boolean;
  authorId: string;
  projectId?: string;
  latestVersion?: VersionDetail;
  url: string;
  messages: MessageSummary[];
  files?: {
    lang: string;
    meta: {
      [k: string]: string;
    };
    source: string;
  }[];
  text: string;
}

export interface ChatMetadataResponse {
  git?: {
    branch?: string;
    commit?: string;
  };
  deployment?: {
    id?: string;
  };
  project?: {
    id?: string;
    name?: string;
    url?: string;
  };
}

export interface DeleteChatResponse {
  id: string;
  object: "chat";
  deleted: true;
}

export interface ForkChatResponse {
  id: string;
  object: "chat";
  url: string;
  shareable: boolean;
  privacy?: ChatPrivacy;
  name?: string;
  updatedAt?: string;
  favorite: boolean;
  authorId: string;
  latestVersion?: {
    id: string;
    status: "pending" | "completed" | "failed";
  };
  messages: MessageSummary[];
}

export type V0Model = "v0-1.5-sm" | "v0-1.5-md" | "v0-1.5-lg" | "v0-1.0-md" | "v0-gpt-5";

export interface CreateChatRequest {
  message: string;
  attachments?: { url: string }[];
  system?: string;
  chatPrivacy?: ChatPrivacy;
  projectId?: string;
  model?: V0Model;
  modelConfiguration?: {
    imageGenerations?: boolean;
    thinking?: boolean;
  };
  responseMode?: "sync" | "async" | "experimental_stream";
}

export interface CreateChatResponse {
  id: string;
  object: "chat";
  url: string;
  shareable: boolean;
  privacy: ChatPrivacy;
  name?: string;
  updatedAt: string;
  favorite: boolean;
  authorId: string;
  projectId?: string;
  latestVersion?: VersionDetail;
  messages: MessageSummary[];
}

export interface CreateProjectResponse {
  id: string;
  object: "project";
  name: string;
  vercelProjectId?: string;
}

export interface CreateMessageRequest {
  message: string;
  attachments?: Array<{
    url: string;
  }>;
  model?: V0Model;
  modelConfiguration?: {
    imageGenerations?: boolean;
    thinking?: boolean;
  };
  responseMode?: "sync" | "async" | "experimental_stream";
}

export interface CreateMessageResponse {
  id: string;
  object: "message";
  chatId: string;
  url: string;
  files?: {
    lang: string;
    meta: {
      [k: string]: string;
    };
    source: string;
  }[];
  text: string;
  modelConfiguration: {
    modelId: V0Model;
    imageGenerations?: boolean;
    thinking?: boolean;
  };
}

export interface Deployment {
  id: string;
  object: "deployment";
  projectId: string;
  url: string;
  status: "BUILDING" | "READY" | "CANCELED" | "ERROR";
  createdAt: string;
  updatedAt: string;
}

export interface InitializeChatResponse {
  id: string;
  object: "chat";
  shareable: boolean;
  privacy: ChatPrivacy;
  name?: string;
  updatedAt?: string;
  favorite: boolean;
  authorId: string;
  projectId?: string;
  latestVersion?: VersionDetail;
  url: string;
  messages: MessageSummary[];
  files?: {
    lang: string;
    meta: {
      [k: string]: string;
    };
    source: string;
  }[];
  text: string;
}

export interface ProjectDetail {
  id: string;
  object: "project";
  name: string;
  chats: ChatSummary[];
  vercelProjectId?: string;
}

export interface FindProjectsResponse {
  object: "list";
  data: ProjectDetail[];
}

export interface Project {
  id: string;
  object: "project";
  name: string;
  vercelProjectId?: string;
}

export interface Profile {
  id: string;
  name: string;
  apiKey: string;
  defaultScope?: string;
  defaultScopeName?: string;
}

export interface ActiveProfileId {
  id: string;
}

export interface ScopeSummary {
  id: string;
  object: "scope";
  name?: string;
}

export interface FindScopesResponse {
  object: "list";
  data: ScopeSummary[];
}

export interface ProjectChatsResponse {
  object: "project";
  id: string;
  name: string;
  description?: string;
  chats: ChatSummary[];
}

export enum ApiVersion {
  V1 = "v1",
}

export interface File {
  lang: string;
  meta: Record<string, string>;
  source: string;
}

export interface Chat {
  id: string;
  object: "chat";
  shareable: boolean;
  privacy: ChatPrivacy;
  name?: string;
  updatedAt: string;
  favorite: boolean;
  authorId: string;
  projectId?: string;
  latestVersion?: VersionDetail;
  url: string;
  messages: MessageSummary[];
  files?: File[];
  text: string;
}

export interface CompletionMessage {
  role: "user" | "assistant" | "system";
  content: string | Array<string | { type: "image_url"; image_url: { url: string } }>;
}

export interface ChatCompletionRequest {
  model: V0Model;
  messages: CompletionMessage[];
  stream?: boolean;
  tools?: Array<Record<string, unknown>>;
  tool_choice?: string | Record<string, unknown>;
  max_completion_tokens?: number;
}

export interface ChatCompletionResponse {
  id: string;
  model: V0Model;
  object: "chat.completion" | "chat.completion.chunk";
  created: number;
  choices: Array<{
    index: number;
    message?: CompletionMessage;
    delta?: CompletionMessage;
    finish_reason: string | null;
  }>;
}

export interface AssignProjectResponse {
  object: string;
  id: string;
  assigned: boolean;
}
