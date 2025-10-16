import { useEffect, useState } from "react";
import { generateQuestionId } from "../utils/generateQuestionId";

export type Question = {
  id: string;
  question: string;
  answer: string;
};

export function useQuestions(summary: string | undefined) {
  const [question, setQuestion] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: generateQuestionId(),
      question: "Initial Summary of the video",
      answer: summary ?? "",
    },
  ]);

  useEffect(() => {
    if (summary) {
      setQuestions((prevQuestions) => [
        {
          ...prevQuestions[0],
          answer: summary,
        },
        ...prevQuestions.slice(1),
      ]);
    }
  }, [summary]);

  return { questions, setQuestions, question, setQuestion };
}
