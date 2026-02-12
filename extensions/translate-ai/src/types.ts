export const LANGUAGES = [
  { code: "en", label: "EN", name: "English" },
  { code: "pl", label: "PL", name: "Polish" },
  { code: "ru", label: "RU", name: "Russian" },
] as const;

export type TargetLanguage = (typeof LANGUAGES)[number]["code"];

export interface TranslateRequest {
  text: string;
  lang: TargetLanguage;
  apiKey: string;
}

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaudeApiRequest {
  model: string;
  max_tokens: number;
  messages: ClaudeMessage[];
}

export interface ClaudeApiResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface OpenAIApiResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export const TOAST_MESSAGES = {
  emptyText: { title: "Error", message: "Please enter text to translate" },
  noApiKey: { title: "Error", message: "Please configure Claude or OpenAI API key in preferences" },
  success: { title: "Translation complete" },
  successCopied: { title: "Translation complete", message: "Copied to clipboard" },
  failure: { title: "Translation failed" },
} as const;
