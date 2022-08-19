export interface Account {
  id: string;
  name: string;
  userName: string;
  fullName: string;
  email: string;
  numUnread: number;
  mailboxes?: MailBox[];
  messages?: Message[];
}

export interface MailBox {
  id: string;
  name: string;
  messages?: Message[];
}

export interface Message {
  id: string;
  account: string;
  subject: string;
  content: string;
  senderName: string;
  senderAddress: string;
  numAttachments: number;
  date: Date;
  read: boolean;
  replyTo?: string;
  replied?: boolean;
  forwarded?: boolean;
  redirected?: boolean;
}

export interface OutgoingMessage {
  account: string;
  subject: string;
  content: string;
  recipients: string[];
  ccs: string[];
  bccs: string[];
  attachments?: string[];
}

export interface Attachment {
  id: string;
  name: string;
  size: string;
  type?: string;
}

export interface Preferences {
  attachmentsDirectory: string;
}
