export interface Attachment {
  type: "image" | "text";
  path: string; // absolute path
  name: string; // basename, for display
  content?: string; // only for type === "text": frozen at attach time
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  attachments?: Attachment[]; // only on user messages
}

export interface Chat {
  id: string;
  title: string;
  model: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface ModelInfo {
  id: string;
  loaded: boolean;
  instanceIds: string[];
  kind: string; // native `type` field: "llm" | "embedding" | ...
  vision: boolean; // capabilities.vision
}
