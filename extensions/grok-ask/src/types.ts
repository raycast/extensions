export interface Conversation {
  id: string;
  title: string;
  model: string;
  systemPromptId?: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface ConversationSummary {
  id: string;
  title: string;
  model: string;
  messageCount: number;
  updatedAt: number;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  reasoning?: string;
  images?: string[];
  timestamp: number;
}

export interface Citation {
  index: number;
  title: string;
  url: string;
}

export interface GrokError {
  code: number;
  type: string;
  message: string;
  userMessage: string;
  action: ErrorAction;
}

export type ErrorAction =
  | { type: "open_preferences" }
  | { type: "open_url"; url: string }
  | { type: "retry" }
  | { type: "retry_after"; seconds: number }
  | { type: "none" };

export interface SSEEvent {
  event: string;
  data: string;
}

export interface StreamCallbacks {
  onText: (delta: string) => void;
  onReasoning: (delta: string) => void;
  onSearching: (query?: string) => void;
  onSearchComplete: () => void;
  onAnnotation: (citation: Citation) => void;
  onComplete: () => void;
  onError: (error: GrokError) => void;
}

export interface GrokRequestParams {
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  systemPrompt?: string;
}

export interface Preferences {
  apiKey: string;
  defaultAskModel: string;
  defaultChatModel: string;
  systemPromptPreset: string;
  systemPrompt: string;
}

export interface ApiModel {
  id: string;
  name: string;
}

export interface SystemPromptItem {
  id: string;
  name: string;
  content: string;
}
