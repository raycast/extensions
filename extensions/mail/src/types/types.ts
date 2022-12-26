import { Image } from "@raycast/api";

export type Account = {
  id: string;
  name: string;
  userName: string;
  fullName: string;
  email: string;
  numUnread: number;
  messages?: Message[];
};

export type Message = {
  id: string;
  account: string;
  accountAddress: string;
  subject: string;
  content: string;
  numAttachments: number;
  date: Date;
  read: boolean;
  senderName: string;
  senderAddress: string;
  recipientNames?: string[];
  recipientAddresses?: string[];
  replyTo?: string;
  replied?: boolean;
  forwarded?: boolean;
  redirected?: boolean;
};

export type MessageProps = {
  mailbox: string;
  account: Account;
  message: Message;
  setMessage: (account: Account, message: Message) => void;
  deleteMessage: (account: Account, message: Message) => void;
};

export type OutgoingMessageForm = {
  account: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  content: string;
  attachments: string[];
};

export type OutgoingMessage = {
  account: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  content: string;
  attachments?: string[];
};

export type Attachment = {
  id: string;
  name: string;
  size: string;
  type?: string;
};

export type Mailbox = {
  title: string;
  mailbox: string;
  icon: Image.ImageLike;
};

export type Preferences = {
  primaryAction: string;
  primaryMailbox: string;
  saveDirectory: string;
  selectDirectory: string;
};
