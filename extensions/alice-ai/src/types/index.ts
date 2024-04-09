export interface Action {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  model: string;
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
