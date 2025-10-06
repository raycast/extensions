export type Contact = {
  additional_attributes: {
    company_name: string;
  };
  email: string;
  id: number;
  name: string;
  thumbnail: string;
  created_at: number;
};
export enum MessageType {
  Incoming,
  Outgoing,
  Bot = 3,
}
export type Message = {
  id: number;
  content: string | null;
  created_at: number;
  private: boolean;
} & (
  | {
      message_type: Exclude<MessageType, MessageType.Bot>;
      sender: {
        name: string;
      };
    }
  | {
      message_type: MessageType.Bot;
      sender?: never;
    }
);
export type Conversation = {
  meta: {
    sender: {
      email: string | null;
      name: string;
    };
  };
  id: number;
  messages: Message[];
  created_at: number;
  last_activity_at: number;
};
export type Inbox = {
  id: number;
  avatar_url: string;
  name: string;
  channel_type: string;
};
export type Integration = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
};

export type ListResult<T> = {
  meta: {
    count: number;
    current_page: number;
  };
  payload: T[];
};
