import { Model, ReasoningLevel } from "../lib/OpenAI";

export interface Action {
  id: string;
  name: string;
  color: string;
  description: string;
  systemPrompt: string;
  model: Model;
  reasoningLevel?: ReasoningLevel;
  temperature: string;
  maxTokens: string;
  favorite: boolean;
}

export interface History {
  id: string;
  action: Action;
  timestamp: number;
  prompt: string;
  result: string;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
}
