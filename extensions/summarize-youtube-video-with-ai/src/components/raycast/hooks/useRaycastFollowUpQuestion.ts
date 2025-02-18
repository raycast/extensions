import { AI, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import { v4 as uuid } from "uuid";
import { FINDING_ANSWER } from "../../../const/toast_messages";
import { getFollowUpQuestionSnippet } from "../../../utils/getAiInstructionSnippets";

export function useRaycastFollowUpQuestion(
  questions: Array<{ id: string; question: string; answer: string }>,
  setQuestions: React.Dispatch<React.SetStateAction<Array<{ id: string; question: string; answer: string }>>>,
  setQuestion: React.Dispatch<React.SetStateAction<string>>,
  transcript: string | undefined,
  question: string,
) {
  useEffect(() => {
    const handleAdditionalQuestion = async () => {
      if (!question || !transcript) return;
      const qID = uuid();

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: FINDING_ANSWER.title,
        message: FINDING_ANSWER.message,
      });

      const answer = AI.ask(getFollowUpQuestionSnippet(question, transcript));

      setQuestions((prevQuestions) => [
        {
          id: qID,
          question,
          answer: "",
        },
        ...prevQuestions,
      ]);

      answer.on("data", (data) => {
        toast.show();
        setQuestions((prevQuestions) =>
          prevQuestions.map((question) =>
            question.id === qID ? { ...question, answer: question.answer + data } : question,
          ),
        );
      });

      answer.finally(() => {
        toast.hide();
        setQuestion("");
      });
    };

    handleAdditionalQuestion();
  }, [question, transcript]);
}
