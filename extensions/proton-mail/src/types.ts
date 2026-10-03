export interface Email {
  uid: number;
  messageId: string;
  subject: string;
  from: EmailAddress[];
  to: EmailAddress[];
  cc?: EmailAddress[];
  date: Date;
  // Arrays, not Sets: cached data goes through JSON, which turns a Set into {}
  flags: string[];
  hasAttachment: boolean;
  preview?: string;
  // Proton's own message ID (Bridge's X-Pm-Internal-Id header), used to open the email on the web
  protonId?: string;
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
  flags: string[];
  specialUse?: string;
  messagesCount?: number;
  unseenCount?: number;
}

export type EmailFilter = "all" | "unread" | "read" | "attachment";
