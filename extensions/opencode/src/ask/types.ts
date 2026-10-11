export interface FormValues {
  question: string;
  model: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  // Thinking models (e.g. Kimi, DeepSeek on Go) expect their earlier reasoning replayed on follow-ups.
  reasoning?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
  model: string;
}
