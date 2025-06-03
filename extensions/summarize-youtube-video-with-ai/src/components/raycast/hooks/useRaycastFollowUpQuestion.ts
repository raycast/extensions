import { AI, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import { FINDING_ANSWER } from "../../../const/toast_messages";
import { useHistory } from "../../../hooks/useHistory";
import type { Question } from "../../../hooks/useQuestions";
import type { RaycastPreferences } from "../../../summarizeVideoWithRaycast";
import { generateQuestionId } from "../../../utils/generateQuestionId";
import { getFollowUpQuestionSnippet } from "../../../utils/getAiInstructionSnippets";

type FollowUpQuestionParams = {
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  setQuestion: React.Dispatch<React.SetStateAction<string>>;
  transcript: string | undefined;
  question: string;
  videoId?: string;
};

export function useRaycastFollowUpQuestion({
  setQuestions,
  setQuestion,
  transcript,
  question,
  videoId,
}: FollowUpQuestionParams) {
  const { updateHistory } = useHistory();
  const abortController = new AbortController();
  const preferences = getPreferenceValues() as RaycastPreferences;
  const { creativity } = preferences;

  useEffect(() => {
    const handleAdditionalQuestion = async () => {
      if (!question || !transcript) return;
      const qID = generateQuestionId();

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: FINDING_ANSWER.title,
        message: FINDING_ANSWER.message,
      });

      const answer = AI.ask(getFollowUpQuestionSnippet(question, transcript), {
        creativity: Number.parseInt(creativity),
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

      answer.on("data", (data) => {
        toast.show();
        setQuestions((prevQuestions) => {
          const updatedQuestions = prevQuestions.map((q) => (q.id === qID ? { ...q, answer: q.answer + data } : q));
          return updatedQuestions;
        });
      });

      answer.finally(() => {
        toast.hide();
        setQuestion("");
        setQuestions((prevQuestions) => {
          if (videoId) {
            updateHistory(videoId, prevQuestions);
          }
          return prevQuestions;
        });
      });

      if (abortController.signal.aborted) return;
    };

    handleAdditionalQuestion();

    return () => {
      abortController.abort();
    };
  }, [question, transcript, abortController, creativity, setQuestion, setQuestions, updateHistory, videoId]);
}
