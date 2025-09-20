export interface ChatData {
  currentChat: string;
  chats: Chats[];
}

export interface Chats {
  name: string;
  creationDate: Date;
  modelName?: string;
  messages: Message[];
}

export interface Message {
  prompt: string;
  answer: string;
  creationDate: string;
  finished: boolean;
  modelName: string;
}
