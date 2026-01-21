export interface Preferences {
  imapHost: string;
  imapPort: string;
  smtpHost: string;
  smtpPort: string;
  username: string;
  password: string;
  emailsToLoad: string;
  composeFormat: "markdown" | "plaintext";
}

export interface Email {
  uid: number;
  messageId: string;
  subject: string;
  from: EmailAddress[];
  to: EmailAddress[];
  cc?: EmailAddress[];
  date: Date;
  flags: Set<string>;
  hasAttachment: boolean;
  preview?: string;
  body?: string;
  htmlBody?: string;
}

export interface EmailAddress {
  name?: string;
  address: string;
}

export interface Folder {
  path: string;
  name: string;
  delimiter: string;
  flags: Set<string>;
  specialUse?: string;
  messagesCount?: number;
  unseenCount?: number;
}

export type EmailFilter = "all" | "unread" | "read" | "attachment";
