import { AI, showToast, Toast } from "@raycast/api";
import { v4 as uuid } from "uuid";
import { FINDING_ANSWER } from "../../../const/toast_messages";
import { getFollowUpQuestionSnippet } from "../../../utils/getAiInstructionSnippets";
import { Question } from "../../summary/SummaryDetails";

export const useRaycastFollowUpQuestion = async (
  questions: Question[],
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>,
  setQuestion: React.Dispatch<React.SetStateAction<string>>,
  transcript?: string,
  question?: string,
) => {
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
      setSelectedQuestionId(qID);
    });
  };

  return { handleAdditionalQuestion };
};
