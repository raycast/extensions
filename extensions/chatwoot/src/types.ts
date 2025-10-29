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
  Activity,
  Bot,
}
export type Message = {
  id: number;
  content: string | null;
  created_at: number;
  private: boolean;
  status: "sent" | "delivered" | "read" | "failed";
} & (
  | {
      message_type: Exclude<MessageType, MessageType.Activity | MessageType.Bot>;
      sender: {
        name: string;
      };
    }
  | {
      message_type: MessageType.Activity | MessageType.Bot;
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
  snoozed_until: string | null;
  status: "open" | "resolved" | "pending" | "snoozed";
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

export type Notification = {
  id: number;
  notification_type: string;
  push_message_body: string;
  primary_actor_type: string;
  primary_actor_id: number;
  read_at: number | null;
  created_at: number;
};

export type Portal = {
  id: number;
  color: string;
  name: string;
  header_text: string;
  slug: string;
  custom_domain: string;
  homepage_link: string;
  page_title: string;
  archived: boolean;
  config: {
    allowed_locales: string[];
    default_locale: string;
  };
  logo?: {
    file_url: string;
  };
};

export type ListResult<T> = {
  meta: {
    count: number;
    current_page: number;
  };
  payload: T[];
};
