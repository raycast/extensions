import { Image } from "@raycast/api";

export type AnyFn<T = void> = (...args: unknown[]) => T;

export type AnyObject = Record<string, unknown>;

export type MaybePromise<T> = T | Promise<T>;

export type Account = {
  id: string;
  name: string;
  userName: string;
  fullName: string;
  emails: string[];
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

export type Action = () => Promise<void>;

export type ActionPayload = {
  account: Account;
  message: Message;
};

export type MessageProps = {
  account: Account;
  mailbox: Mailbox;
  message: Message;
  onAction?: (action: Action, payload: ActionPayload) => MaybePromise<void>;
};

export enum OutgoingMessageAction {
  New = "Send Message",
  Reply = "Reply",
  ReplyAll = "Reply All",
  Forward = "Forward",
  Redirect = "Redirect",
}

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
