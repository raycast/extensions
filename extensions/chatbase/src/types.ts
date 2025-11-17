export type Chatbot = {
  id: string;
  name: string;
  visibility: "private" | "public";
  instructions: string;
  ip_limit: number;
  ip_limit_timeframe: number;
  ip_limit_message: string;
  styles: {
    button_color: string;
  };
  model: string;
  last_trained_at: string;
  temp: number;
  size: number;
};

type Source =
  | "API"
  | "Chatbase site"
  | "Instagram"
  | "Messenger"
  | "Slack"
  | "Unspecified"
  | "WhatsApp"
  | "Widget or Iframe";
type Message = {
  id?: string;
  role: "assistant" | "user";
  content: string;
};
export type Conversation = {
  source: Source;
  id: string;
  messages: Message[];
};
