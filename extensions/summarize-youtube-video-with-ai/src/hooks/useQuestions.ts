import { useState } from "react";
import { v4 as uuid } from "uuid";

export interface Question {
  id: string;
  question: string;
  answer: string;
}

export function useQuestions(summary: string | undefined) {
  const [question, setQuestion] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: uuid(),
      question: "Initial Summary of the video",
      answer: summary ?? "",
    },
  ]);

  const handleAdditionalQuestion = (newQuestion: string) => {
    setQuestion(newQuestion);
  };

  return { questions, setQuestions, question, setQuestion, handleAdditionalQuestion };
}
