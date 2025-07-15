import Anthropic from "@anthropic-ai/sdk";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import { ANTHROPIC_MODEL } from "../../../const/defaults";
import { ALERT, FINDING_ANSWER } from "../../../const/toast_messages";
import type { Question } from "../../../hooks/useQuestions";
import type { AnthropicPreferences } from "../../../summarizeVideoWithAnthropic";
import { generateQuestionId } from "../../../utils/generateQuestionId";
import { getFollowUpQuestionSnippet } from "../../../utils/getAiInstructionSnippets";

type FollowUpQuestionParams = {
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  setQuestion: React.Dispatch<React.SetStateAction<string>>;
  transcript: string | undefined;
  question: string;
};

export function useAnthropicFollowUpQuestion({
  setQuestions,
  setQuestion,
  transcript,
  question,
}: FollowUpQuestionParams) {
  const abortController = new AbortController();
  const preferences = getPreferenceValues() as AnthropicPreferences;
  const { anthropicApiToken, anthropicModel, creativity } = preferences;

  useEffect(() => {
    const handleAdditionalQuestion = async () => {
      if (!question || !transcript) return;
      const qID = generateQuestionId();

      const anthropic = new Anthropic({
        apiKey: anthropicApiToken,
      });

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

      const answer = anthropic.messages.stream(
        {
          model: anthropicModel || ANTHROPIC_MODEL,
          max_tokens: 8192,
          stream: true,
          messages: [{ role: "user", content: getFollowUpQuestionSnippet(question, transcript) }],
          temperature: Number.parseInt(creativity, 10),
        },
        { signal: abortController.signal },
      );

      answer.on("text", (delta) => {
        toast.show();
        setQuestions((prevQuestions) =>
          prevQuestions.map((q) => (q.id === qID ? { ...q, answer: (q.answer || "") + delta } : q)),
        );
      });

      answer.finalMessage().then(() => {
        toast.hide();
        setQuestion("");
      });

      if (abortController.signal.aborted) return;

      answer.on("error", (error) => {
        if (abortController.signal.aborted) return;
        toast.style = Toast.Style.Failure;
        toast.title = ALERT.title;
        toast.message = error instanceof Error ? error.message : "Unknown error occurred";
      });
    };

    handleAdditionalQuestion();

    return () => {
      abortController.abort();
    };
  }, [question, transcript, abortController, anthropicApiToken, anthropicModel, creativity, setQuestion, setQuestions]);
}
