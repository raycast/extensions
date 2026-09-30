export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  content: string;
  finishReason?: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullResponse: string) => void;
  onError: (error: Error) => void;
}

export interface AIProvider {
  name: string;
  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream(request: ChatRequest, callbacks: StreamCallbacks): Promise<void>;
}

export interface ProviderConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}
