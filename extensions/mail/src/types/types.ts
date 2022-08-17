export interface Account {
  id: string;
  name: string;
  userName: string;
  fullName: string;
  email: string;
  mailboxes?: MailBox[];
  messages?: Message[];
}

export interface Message {
  id: string;
  account: string; 
  subject: string;
  content: string;
  sender: string;
  date: string;
  read: string;
  replyTo: string;
  replied: string;
  forwarded: string;
  redirected: string;
}

export interface MailBox {
  id: string;
  name: string;
  messages?: Message[];
}
