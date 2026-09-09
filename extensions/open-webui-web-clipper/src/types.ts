export type CaptureMode = "selection" | "page" | "url";
export type SendMode = "save" | "chat" | "append";
export type PromptMode = "none" | "discuss" | "summarize" | "research";
export type OpenAfterSendMode = "never" | "send_only" | "always";

export interface PreferencesShape {
  baseUrl: string;
  apiKey: string;
  openAfterSendMode?: OpenAfterSendMode;
}

export interface Clip {
  mode: CaptureMode;
  title: string;
  url: string;
  content: string;
  capturedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  parent_id?: string | null;
  data?: {
    files?: FolderAttachment[];
    [key: string]: unknown;
  } | null;
}

export interface FolderAttachment {
  id: string;
  type: "file" | "collection" | "note";
  name?: string;
  url?: string;
  status?: string;
  [key: string]: unknown;
}

export interface UploadedFile {
  id: string;
  filename?: string;
  data?: Record<string, unknown>;
  meta?: {
    name?: string;
    content_type?: string;
    size?: number;
    collection_name?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ChatFileRef {
  type: "file";
  id: string;
  url: string;
  name: string;
  status: "uploaded";
  content_type: string;
  size?: number;
  context?: "full";
  file?: UploadedFile;
  collection_name?: string;
  [key: string]: unknown;
}

export interface ModelInfo {
  id: string;
  name?: string;
}

export interface ChatOperationResult {
  chat: ChatRecord;
  warnings: string[];
}

export interface ChatRecord {
  id: string;
  title: string;
  folder_id?: string | null;
  chat: ChatData;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  parentId?: string | null;
  childrenIds?: string[];
  timestamp?: number;
  models?: string[];
  model?: string;
  modelName?: string;
  modelIdx?: number;
  done?: boolean;
  files?: ChatFileRef[];
}

export interface ChatData {
  title?: string;
  models?: string[];
  messages?: ChatMessage[];
  history?: {
    currentId?: string | null;
    messages?: Record<string, ChatMessage>;
  };
  currentId?: string | null;
  files?: ChatFileRef[];
  [key: string]: unknown;
}
