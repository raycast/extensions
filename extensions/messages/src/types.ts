import type { Image } from "@raycast/api";

// Shared types used across helpers, hooks, and components.
// Lives in a dependency-free module to avoid circular imports.

export type Filter = "" | "contacts" | "unread" | "read" | "me" | "audio" | "attachments";

export type ChatParticipant = {
  chat_identifier: string;
  group_name: string | null;
  display_name: string | null;
  group_participants: string | null;
  latest_message_guid?: string | null;
  group_photo_path?: string | null;
  is_group: boolean;
};

export type MessagesTarget = Pick<
  ChatParticipant,
  "chat_identifier" | "group_participants" | "is_group" | "latest_message_guid"
>;

export type ChatOrMessageInfo = {
  chat_identifier: string;
  is_from_me?: boolean;
  is_group: boolean;
  display_name?: string | null;
  group_participants?: string | null;
  group_photo_path?: string | null;
};

export type Contact = {
  id: string;
  givenName: string;
  familyName: string;
  displayName: string;
  phoneNumbers: { number: string; countryCode: string | null }[];
  emailAddresses: string[];
  matchedChatIdentifiers: string[];
  imageData: string | null;
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
