import { AI } from "@raycast/api";

export type AIProvider = "raycast" | "openai";

export interface TestResult {
  success: boolean;
  message: string;
  details?: {
    provider?: AIProvider;
    model?: string;
    response?: string;
    error?: string;
  };
}

export interface AIModelConfig {
  id: string;
  name: string;
  provider: AIProvider;
  enabled: boolean;
  maxTokens: number;
  contextWindow: number;
  pricing: {
    input: number;
    output: number;
  };
  capabilities: {
    chat: boolean;
    completion: boolean;
    translation: boolean;
  };
}

export interface AIServiceConfig {
  provider: AIProvider;
  models: AIModelConfig[];
}

export interface ChatRequest {
  messages: Message[];
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content: string;
}

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export enum WritingStyle {
  Professional = "professional",
  Casual = "casual",
  Academic = "academic",
}

export interface AIRequestOptions {
  style?: WritingStyle;
  creativity?: AI.Creativity;
  temperature?: number;
  maxTokens?: number;
}

export interface Suggestion {
  text: string;
  type: "completion" | "translation" | "polish";
}

export interface WritingState {
  input: string;
  suggestions: Suggestion[];
  isLoading: boolean;
  error?: string;
}
