export interface MessageContentText {
  type: "text";
  text: string;
}

export interface MessageContentImageUrl {
  type: "image_url";
  image_url: {
    url: string;
  };
}

export type MessageContent =
  | string
  | Array<MessageContentText | MessageContentImageUrl>;

export interface Message {
  role: "system" | "user" | "assistant";
  content: MessageContent;
}

export interface JanApiResponse {
  choices: Array<{
    message: {
      content: string;
      role?: string;
      reasoning_content?: string; // For Jan-v2 and reasoning models
    };
    finish_reason: string;
    index?: number;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface JanApiError extends Error {
  status?: number;
}

export interface ParsedTask {
  title: string;
  notes?: string;
  dueDate?: string;
  dueTime?: string; // Format: "HH:MM" in 24-hour time (e.g. "12:00", "14:30")
  amount?: number;
  repeatInterval?: "daily" | "weekly" | "monthly" | "yearly" | null;
  isInvoice?: boolean;
  isBill?: boolean;
}

// For handling multiple tasks from invoice parsing
export interface ParsedTasksResponse {
  tasks: ParsedTask[];
}
