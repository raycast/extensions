// Re-export model-specific types
export * from "./get-all-model";

// AI Response types
export interface AIResponse {
  result:
    | {
        response?: string;
        choices?: Array<{ message?: { content?: string } }>;
        output?: Array<{ type?: string; content?: Array<{ text?: string; type?: string }>; role?: string }>;
      }
    | string
    | Array<{ content?: string; generated_text?: string }>;
  success: boolean;
  errors: Array<{ message: string }>;
}

// Model types
export interface Model {
  name: string;
  description?: string;
  task?: {
    name: string;
  };
}

export interface ModelsResponse {
  result: Model[];
  success: boolean;
  errors: Array<{ message: string }>;
}

export interface ModelDropdownItem {
  title: string;
  value: string;
}

// Conversation types
export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface Chat {
  id: string;
  question: string;
  answer: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  model: string;
  chats: Chat[];
  created_at: string;
  updated_at: string;
  pinned: boolean;
}

export interface ConversationsHook {
  data: Conversation[];
  isLoading: boolean;
  add: (conversation: Conversation) => Promise<void>;
  update: (conversation: Conversation) => Promise<void>;
  remove: (conversation: Conversation) => Promise<void>;
  clear: () => Promise<void>;
}
