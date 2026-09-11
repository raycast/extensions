export interface FormValues {
  question: string;
  model?: string;
}

export interface CompareFormValues {
  question: string;
  models: string[];
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
  model: string;
}

export interface AIPreferences {
  AI_GATEWAY_API_KEY: string;
  AI_MODEL: string;
}

export type ModelStatus = "generating" | "completed" | "error";

export interface ModelResponse {
  model: string;
  response: string;
  status: "completed" | "error";
  error?: Error;
}

export type ViewType = "list" | "form" | "response";
