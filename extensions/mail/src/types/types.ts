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

export interface Message {
  id: string;
  account: string; 
  subject: string;
  content: string;
  sender: string;
  senderEmail?: string;
  date: Date;
  read: boolean;
  replyTo: string;
  replied: boolean;
  forwarded: boolean;
  redirected: boolean;
}

export interface MailBox {
  id: string;
  name: string;
  messages?: Message[];
}
