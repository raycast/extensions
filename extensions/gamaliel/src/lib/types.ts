export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface Preferences {
  theology: string;
  profile: string;
  bibleId: string;
  maxWords?: string;
}

export interface ScriptureLink {
  label: string;
  url: string;
}

export interface ChatCompletionChunk {
  choices?: Array<{
    delta?: {
      content?: string | null;
    };
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
    code?: string;
  };
}
