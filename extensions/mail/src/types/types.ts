import { Color, Icon, Image } from "@raycast/api";

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

type Mailbox = { title: string; mailbox: string; icon: Image.ImageLike };

export const Mailboxes: { [key: string]: Mailbox } = {
  all: {
    title: "All Mail",
    mailbox: "All Mail",
    icon: { source: "../assets/icons/envelope.svg", tintColor: Color.PrimaryText },
  },
  recent: {
    title: "Recent Mail",
    mailbox: "All Mail",
    icon: { source: "../assets/icons/recent.svg", tintColor: Color.PrimaryText },
  },
  important: {
    title: "Important Mail",
    mailbox: "Important",
    icon: { source: "../assets/icons/important.svg", tintColor: Color.PrimaryText },
  },
  starred: {
    title: "Starred Mail",
    mailbox: "Starred",
    icon: Icon.Star,
  },
  inbox: {
    title: "Inbox",
    mailbox: "Inbox",
    icon: { source: "../assets/icons/inbox.svg", tintColor: Color.PrimaryText },
  },
  sent: {
    title: "Sent Mail",
    mailbox: "Sent Mail",
    icon: { source: "../assets/icons/sent.svg", tintColor: Color.PrimaryText },
  },
  junk: {
    title: "Junk Mail",
    mailbox: "Spam",
    icon: { source: "../assets/icons/junk.svg", tintColor: Color.PrimaryText },
  },
  trash: {
    title: "Trash",
    mailbox: "Trash",
    icon: { source: "../assets/icons/trash.svg", tintColor: Color.PrimaryText },
  },
};
