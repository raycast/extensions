export interface Email {
  /** Real IMAP mailbox path (required for UID-scoped operations). */
  mailboxPath: string;
  uid: number;
  messageId: string;
  subject: string;
  from: EmailAddress[];
  to: EmailAddress[];
  cc?: EmailAddress[];
  date: Date;
  flags: string[];
  hasAttachment: boolean;
  preview?: string;
  body?: string;
  htmlBody?: string;
}

export interface EmailBody {
  text?: string;
  html?: string;
}

export interface EmailAddress {
  name?: string;
  address: string;
}

export interface Folder {
  path: string;
  name: string;
  delimiter: string;
  flags: string[];
  specialUse?: string;
  messagesCount?: number;
  unseenCount?: number;
}

export type EmailFilter = "all" | "unread" | "read" | "attachment";
