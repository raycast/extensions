import Anthropic from "@anthropic-ai/sdk";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import { ANTHROPIC_MODEL } from "../../../const/defaults";
import { ALERT, FINDING_ANSWER } from "../../../const/toast_messages";
import { Question } from "../../../hooks/useQuestions";
import { AnthropicPreferences } from "../../../summarizeVideoWithAnthropic";
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
  useEffect(() => {
    const handleAdditionalQuestion = async () => {
      if (!question || !transcript) return;
      const qID = generateQuestionId();

      const preferences = getPreferenceValues() as AnthropicPreferences;
      const { anthropicApiToken, anthropicModel } = preferences;

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
          question: "Initial Summary of the video",
          answer: "",
        },
        ...prevQuestions,
      ]);

      const answer = anthropic.messages.stream({
        model: anthropicModel || ANTHROPIC_MODEL,
        max_tokens: 8192,
        stream: true,
        messages: [{ role: "user", content: getFollowUpQuestionSnippet(question, transcript) }],
      });

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

      answer.on("error", (error) => {
        toast.style = Toast.Style.Failure;
        toast.title = ALERT.title;
        toast.message = error instanceof Error ? error.message : "Unknown error occurred";
      });
    };

    handleAdditionalQuestion();
  }, [question, transcript]);
}
