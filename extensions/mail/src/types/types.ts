import { Image } from "@raycast/api";

export type Account = {
  id: string;
  name: string;
  userName: string;
  fullName: string;
  email: string;
  numUnread: number;
  mailboxes: Mailbox[];
  messages?: Message[];
};

export type Mailbox = {
  name: string;
  unreadCount: number;
  icon?: Image.ImageLike;
  messages?: Message[];
};

export type Message = {
  id: string;
  account: string;
  accountAddress: string;
  subject: string;
  content?: string;
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
  account: Account;
  mailbox: Mailbox;
  message: Message;
  setMessage: (account: Account, message: Message) => void;
  deleteMessage: (account: Account, message: Message) => void;
};

export enum OutgoingMessageAction {
  New = "Send Message",
  Reply = "Reply",
  ReplyAll = "Reply All",
  Forward = "Forward",
  Redirect = "Redirect",
}

export type ComposeMessageProps = {
  account?: Account;
  message?: Message;
  mailbox?: Mailbox;
  attachments?: string[];
  action?: OutgoingMessageAction;
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

export type Preferences = {
  primaryAction: string;
  saveDirectory: string;
};
