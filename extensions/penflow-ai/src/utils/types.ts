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
    apiKey?: string;
  };
}

export interface AIModelConfig {
  id: string;
  name: string;
  provider: AIProvider;
  enabled: boolean;
  contextWindow: number;
  maxTokens: number;
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
  apiKey?: string;
  baseURL?: string;
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
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ServiceStatus {
  provider: AIProvider;
  isAvailable: boolean;
  activeModels: string[];
  successfulRequests: number;
  failedRequests: number;
  totalTokensUsed: number;
  lastChecked: Date;
}

export interface ServiceLog {
  timestamp: number;
  provider: AIProvider;
  model: string;
  input: string;
  output?: string;
  error?: string;
}

export enum WritingStyle {
  Professional = "professional",
  Casual = "casual",
  Academic = "academic",
}

export interface AIPreferences {
  style: WritingStyle;
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
