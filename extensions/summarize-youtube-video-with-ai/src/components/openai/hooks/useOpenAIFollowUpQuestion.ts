import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import OpenAI from "openai";
import { useEffect } from "react";
import { OPENAI_MODEL } from "../../../const/defaults";
import { ALERT, FINDING_ANSWER } from "../../../const/toast_messages";
import type { Question } from "../../../hooks/useQuestions";
import type { OpenAIPreferences } from "../../../summarizeVideoWithOpenAI";
import { generateQuestionId } from "../../../utils/generateQuestionId";
import { getFollowUpQuestionSnippet } from "../../../utils/getAiInstructionSnippets";

type FollowUpQuestionParams = {
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  setQuestion: React.Dispatch<React.SetStateAction<string>>;
  transcript: string | undefined;
  question: string;
};

export function useOpenAIFollowUpQuestion({ setQuestions, setQuestion, transcript, question }: FollowUpQuestionParams) {
  const preferences = getPreferenceValues() as OpenAIPreferences;
  const { openaiApiToken, openaiEndpoint, openaiModel, creativity } = preferences;

  useEffect(() => {
    const abortController = new AbortController();

    const handleAdditionalQuestion = async () => {
      if (!question || !transcript) return;
      const qID = generateQuestionId();

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: FINDING_ANSWER.title,
        message: FINDING_ANSWER.message,
      });

      const openai = new OpenAI({
        apiKey: openaiApiToken,
      });

      if (openaiEndpoint !== "") {
        openai.baseURL = openaiEndpoint;
      }

      setQuestions((prevQuestions) => [
        {
          id: qID,
          question,
          answer: "",
        },
        ...prevQuestions,
      ]);

      const answer = openai.chat.completions.stream(
        {
          model: openaiModel || OPENAI_MODEL,
          messages: [{ role: "user", content: getFollowUpQuestionSnippet(question, transcript) }],
          stream: true,
          creativity: Number.parseInt(creativity, 10),
        },
        { signal: abortController.signal },
      );

      answer.on("content", (delta) => {
        toast.show();
        setQuestions((prevQuestions) =>
          prevQuestions.map((q) => (q.id === qID ? { ...q, answer: q.answer + delta } : q)),
        );
      });

      answer.finalChatCompletion().then(() => {
        toast.hide();
        setQuestion("");
      });

      if (abortController.signal.aborted) return;

      answer.on("error", (error) => {
        if (abortController.signal.aborted) return;
        toast.style = Toast.Style.Failure;
        toast.title = ALERT.title;
        toast.message = error.message;
      });
    };

    handleAdditionalQuestion();

    return () => {
      abortController.abort();
    };
  }, [question, transcript, creativity, openaiApiToken, openaiEndpoint, openaiModel, setQuestion, setQuestions]);
}
