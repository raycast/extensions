export interface Question {
  id: string;
  question: string;
  answer: string;
  date: Date;
  box: number;
}

export interface ObjDays {
  [key: number]: number;
}
