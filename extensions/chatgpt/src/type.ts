export interface Question {
  id: string;
  question: string;
  createdAt: string;
}

export interface Answer extends Question {
  answer: string;
  conversationId: string;
  savedAt?: string;
}

export interface ChatAnswer extends Answer {
  partialAnswer: string;
  done: boolean;
}

export type ConversationItem = {
  from: "human" | "gpt";
  value: string;
};
