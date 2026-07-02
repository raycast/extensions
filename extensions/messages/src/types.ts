import { Image } from "@raycast/api";

// Shared types used across helpers, hooks, and components.
// Lives in a dependency-free module to avoid circular imports.

export type Filter = "" | "contacts" | "unread" | "read" | "me" | "audio" | "attachments";

export type ChatParticipant = {
  chat_identifier: string;
  group_name: string | null;
  display_name: string | null;
  group_participants: string | null;
  is_group: boolean;
};

export type ChatOrMessageInfo = {
  chat_identifier: string;
  is_from_me?: boolean;
  is_group: boolean;
  display_name?: string | null;
  group_participants?: string | null;
};

export type SQLMessage = ChatParticipant & {
  guid: string;
  date: string;
  date_read: string | null;
  body: string;
  service: "iMessage" | "SMS";
  is_audio_message: boolean;
  is_from_me: boolean;
  is_sent: boolean;
  is_read: boolean;
  attachment_filename: string | null;
  attachment_name: string | null;
  attachment_mime_type: string | null;
  reply_body: string | null;
};

export type Message = SQLMessage & {
  avatar?: Image.ImageLike;
  sender: string;
  senderName: string;
  replyingTo?: string | null;
};
