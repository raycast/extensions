export type Question = {
  id: number;
  text: string;
};

export type Answer = {
  id: string;
  questionId: number;
  response: string;
  year: number;
};

export type QuestionsFile = {
  meta: { language: string; version?: number };
  [question: number]: string;
};

export type QuestionPayload = {
  id: number;
  text: string;
  notes?: string;
  tags?: string[];
};

export type AnswersFile = Record<string, Record<string, AnswerPayload>>; // { "2023": { "1": AnswerPayload, "2": AnswerPayload } }

export type AnswerPayload = {
  id: string;
  questionId: number;
  response: string;
  language?: string;
  url?: string;
  createdAt: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
};
