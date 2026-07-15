// --- Enums ---

export enum CommandType {
  Fix = "Fix Grammar",
  Paraphrase = "Paraphrase",
  Translate = "Translate",
  ToneChange = "Change Tone",
  ContinueText = "Continue Text",
}

export enum ToneType {
  Professional = "Professional",
  Friendly = "Friendly",
  Romantic = "Romantic",
  Happy = "Happy",
  Sad = "Sad",
  Sarcastic = "Sarcastic",
  Angry = "Angry",
  Formal = "Formal",
  Casual = "Casual",
}

export enum ProviderType {
  OpenAI = "openai",
  Gemini = "gemini",
  DeepSeek = "deepseek",
  Groq = "groq",
  Custom = "custom",
}

// --- Interfaces ---

export interface Chat {
  id: string;
  question: string;
  answer: string;
  created_at: string;
}

export interface State {
  command: CommandType | string;
  toneType: ToneType;
  isLoading: boolean;
  chat: Chat;
}

export interface ProviderConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}

export interface Flashcard {
  id: string;
  term: string;
  definition: string;
  example?: string;
  insights?: string[];
  createdAt: string;
  lastTestedAt?: string;
  correctCount: number;
  wrongCount: number;
  interval: number;
  easeFactor: number;
  dueDate: string;
}

export interface Preferences {
  provider: string;
  apiKey: string;
  customBaseUrl?: string;
  customModel?: string;
  isHistoryPaused: boolean;
}
