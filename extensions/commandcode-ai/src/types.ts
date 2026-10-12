export interface FormValues {
  question: string;
  model?: string;
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
