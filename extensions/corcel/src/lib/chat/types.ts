export type ChatId = string;

export type ExchangeId = string;

export type Question = {
  content: string;
  created_on: string;
};

export type Answer = {
  content: string;
  updated_on: string;
};

export type Exchange = {
  id: ExchangeId;
  question: Question;
  created_on: string;
  answer?: Answer;
  model: Preferences["chatModel"];
};

export type Model = Preferences["chatModel"];

export type Chat = {
  id: ChatId;
  title: string;
  created_on: string;
  updated_on: string;
  exchanges: Exchange[];
};
