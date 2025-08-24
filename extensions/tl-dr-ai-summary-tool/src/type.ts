import { Readable } from "stream";

export interface ChatGlmOptions {
  useStream: boolean;
  streamListener?: (data: string, isFinish: boolean) => void;
}
export interface ChatGlmResponse extends Readable {
  code: number;
  msg: string;
  success: boolean;
  data: {
    task_id: string;
    request_id: string;
    task_status: string;
    choices: Array<{ role: string; content: string }>;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };
}
export type PromptMessage = { role: string; content: string };
export interface Message {
  id: number;
  question: string;
  answer: string;
  timestamp: number;
  prompt: Array<PromptMessage>;
}

export interface InputBox {
  text: string;
}

export interface ChatBox {
  boxId: number;
  messages: Message[];
}

export interface ChatHook extends ChatBox {
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isLoading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  ask: (arg0: string) => Promise<void>;
  clear: () => Promise<void>;
}
