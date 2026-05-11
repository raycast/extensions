import { AI, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import { FINDING_ANSWER } from "../../../const/toast_messages";
import type { Question } from "../../../hooks/useQuestions";
import type { RaycastPreferences } from "../../../summarizeVideoWithRaycast";
import { generateQuestionId } from "../../../utils/generateQuestionId";
import { getFollowUpQuestionSnippet } from "../../../utils/getAiInstructionSnippets";

type FollowUpQuestionParams = {
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  setQuestion: React.Dispatch<React.SetStateAction<string>>;
  transcript: string | undefined;
  question: string;
  questions: Question[];
};

export function useRaycastFollowUpQuestion({
  setQuestions,
  setQuestion,
  transcript,
  question,
  questions,
}: FollowUpQuestionParams) {
  const preferences = getPreferenceValues() as RaycastPreferences;
  const { creativity } = preferences;

  useEffect(() => {
    if (!question || !transcript) return;

    const abortController = new AbortController();
    let cancelled = false;
    const qID = generateQuestionId();

    const handleAdditionalQuestion = async () => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: FINDING_ANSWER.title,
        message: FINDING_ANSWER.message,
      });

      // Extract summary (first item) and previous Q&A (rest)
      const summary = questions[0]?.answer || "";
      const previousQA = questions.slice(1).map((q) => ({ question: q.question, answer: q.answer }));

      const stream = AI.ask(getFollowUpQuestionSnippet(question, transcript, summary, previousQA), {
        creativity: Number.parseFloat(creativity),
        signal: abortController.signal,
      });

      setQuestions((prevQuestions) => [
        {
          id: qID,
          question,
          answer: "",
        },
        ...prevQuestions,
      ]);

      stream.on("data", (data) => {
        if (cancelled) return;
        toast.show();
        setQuestions((prevQuestions) => {
          const updated = prevQuestions.slice();
          updated[0] = { ...updated[0], answer: updated[0].answer + data };
          return updated;
        });
      });

      stream.finally(() => {
        if (cancelled) return;
        toast.hide();
        setQuestion("");
      });
    };

    handleAdditionalQuestion();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [question, transcript, questions, creativity, setQuestion, setQuestions]);
}
