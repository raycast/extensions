export interface Question {
  id: string;
  conversationId: string;
  prompt: string;
  response: string;
  createdAt: string;
  isStreaming: boolean;
  modelId?: string;
}
