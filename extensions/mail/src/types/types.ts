import { Icon } from "@raycast/api";

export type Account = {
  id: string;
  name: string;
  userName: string;
  fullName: string;
  email: string;
  numUnread: number;
  mailboxes?: MailBox[];
  messages?: Message[];
};

export type MailBox = {
  id: string;
  name: string;
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

export type OutgoingMessageForm = {
  account: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  content: string;
};

export type OutgoingMessage = OutgoingMessageForm & {
  attachments?: string[];
};

export type Attachment = {
  id: string;
  name: string;
  size: string;
  type?: string;
};

export type Preferences = {
  saveDirectory: string;
  selectDirectory: string;
};
