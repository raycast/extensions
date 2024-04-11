import { Model } from "../lib/OpenAI";

export interface Action {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  model: Model;
  temperature: string;
  maxTokens: string;
}

export interface History {
  id: string;
  action: Action;
  timestamp: number;
  prompt: string;
  result: string;
}
