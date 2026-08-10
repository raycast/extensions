// Enhanced types for image support
interface ImageData {
  base64: string;
  mimeType: string;
  width?: number;
  height?: number;
}

export interface EnhancedClipboardData {
  type: "empty" | "text" | "image" | "mixed";
  text?: string;
  images?: ImageData[];
}

export interface ClipboardData {
  type: "text" | "image" | "empty";
  text?: string;
  base64?: string;
  mimeType?: string;
  filename?: string;
}

export interface ChatMessageContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
    detail?: "low" | "high" | "auto";
  };
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string | ChatMessageContent[];
}

export interface HotKey {
  id: string;
  title: string;
  subtitle: string;
  prompt: string;
  icon: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  hotkey: HotKey;
  clipboardData: EnhancedClipboardData;
  result: string;
}
