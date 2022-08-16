export interface Account {
  id: string;
  name: string;
  email: string;
  messages: Message[];
}

export interface Message {
  id: string;
  subject: string;
  body: string;
  from: Account;
  to: Account;
  date: Date;
}
