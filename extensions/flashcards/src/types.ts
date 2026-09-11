export type CardType = "standard" | "multiple-choice";
export type Progress = "unanswered" | "correct" | "wrong";

export interface Option {
  id: number;
  text: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back?: string;
  options?: Option[];
  correctOption?: number;
  tags: string[];
  type: CardType;
  progress: Progress;
  createdAt: number;
}
