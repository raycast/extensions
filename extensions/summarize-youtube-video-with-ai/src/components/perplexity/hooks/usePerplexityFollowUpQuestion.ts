import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import { ALERT, FINDING_ANSWER } from "../../../const/toast_messages";
import { Question } from "../../../hooks/useQuestions";
import { PerplexityPreferences } from "../../../summarizeVideoWithPerplexity";
import { generateQuestionId } from "../../../utils/generateQuestionId";
import { getFollowUpQuestionSnippet } from "../../../utils/getAiInstructionSnippets";
import { usePerplexityApi } from "./usePerplexityApi";

type FollowUpQuestionParams = {
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  setQuestion: React.Dispatch<React.SetStateAction<string>>;
  transcript: string | undefined;
  question: string;
};

export function usePerplexityFollowUpQuestion({
  setQuestions,
  setQuestion,
  transcript,
  question,
}: FollowUpQuestionParams) {
  const abortController = new AbortController();
  const preferences = getPreferenceValues() as PerplexityPreferences;
  const { creativity } = preferences;
  const perplexityApi = usePerplexityApi();

  useEffect(() => {
    const handleAdditionalQuestion = async () => {
      if (!question || !transcript) return;
      const qID = generateQuestionId();

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: FINDING_ANSWER.title,
        message: FINDING_ANSWER.message,
      });

      setQuestions((prevQuestions) => [
        {
          id: qID,
          question,
          answer: "",
        },
        ...prevQuestions,
      ]);

      const messages = [
        { role: "system", content: "Be precise and concise." },
        { role: "user", content: getFollowUpQuestionSnippet(question, transcript) },
      ];

      perplexityApi.streamRequest(
        {
          messages,
          temperature: parseFloat(creativity),
          maxTokens: 8192,
        },
        {
          onText: (delta) => {
            toast.show();
            setQuestions((prevQuestions) =>
              prevQuestions.map((q) => (q.id === qID ? { ...q, answer: (q.answer || "") + delta } : q)),
            );
          },
          onComplete: () => {
            toast.hide();
            setQuestion("");
          },
          onError: (error) => {
            if (abortController.signal.aborted) return;
            toast.style = Toast.Style.Failure;
            toast.title = ALERT.title;
            toast.message = error.message;
          },
        },
        abortController.signal,
      );
    };

    handleAdditionalQuestion();

    return () => {
      abortController.abort();
    };
  }, [question, transcript]);
}
