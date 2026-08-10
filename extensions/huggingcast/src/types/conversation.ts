import { Question } from "./question";

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  questions?: Question[];
  description?: string; // TODO: maybe implement this (was planning to use AI, but it seems a bit finicky)
}
