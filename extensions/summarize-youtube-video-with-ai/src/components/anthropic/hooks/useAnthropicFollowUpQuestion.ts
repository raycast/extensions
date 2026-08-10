import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { getAnthropicClient } from "../../../utils/sdkClients";
import { useEffect } from "react";
import { ANTHROPIC_MODEL } from "../../../const/defaults";
import { ALERT, FINDING_ANSWER } from "../../../const/toast_messages";
import type { Question } from "../../../hooks/useQuestions";
import type { AnthropicPreferences } from "../../../summarizeVideoWithAnthropic";
import { generateQuestionId } from "../../../utils/generateQuestionId";
import { buildFollowUpMessages } from "../../../utils/getAiInstructionSnippets";

type FollowUpQuestionParams = {
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  setQuestion: React.Dispatch<React.SetStateAction<string>>;
  transcript: string | undefined;
  question: string;
  questions: Question[];
};

export function useAnthropicFollowUpQuestion({
  setQuestions,
  setQuestion,
  transcript,
  question,
  questions,
}: FollowUpQuestionParams) {
  const preferences = getPreferenceValues() as AnthropicPreferences;
  const { anthropicApiToken, anthropicModel, creativity } = preferences;

  useEffect(() => {
    if (!question || !transcript) return;

    const abortController = new AbortController();
    let cancelled = false;
    const qID = generateQuestionId();

    const handleAdditionalQuestion = async () => {
      const anthropic = getAnthropicClient(anthropicApiToken);

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: FINDING_ANSWER.title,
        message: FINDING_ANSWER.message,
      });

      // Extract summary (first item) and previous Q&A (rest)
      const summary = questions[0]?.answer || "";
      const previousQA = questions.slice(1).map((q) => ({ question: q.question, answer: q.answer }));

      setQuestions((prevQuestions) => [
        {
          id: qID,
          question,
          answer: "",
        },
        ...prevQuestions,
      ]);

      const messages = buildFollowUpMessages(question, transcript, summary, previousQA);
      // Anthropic uses separate system parameter, so extract it
      const systemMessage = messages[0].content;
      const chatMessages = messages.slice(1).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const stream = anthropic.messages.stream(
        {
          model: anthropicModel || ANTHROPIC_MODEL,
          max_tokens: 8192,
          stream: true,
          system: systemMessage,
          messages: chatMessages,
          temperature: Number.parseFloat(creativity),
        },
        { signal: abortController.signal },
      );

      stream.on("text", (delta) => {
        if (cancelled) return;
        toast.show();
        setQuestions((prevQuestions) => {
          const updated = prevQuestions.slice();
          updated[0] = { ...updated[0], answer: (updated[0].answer || "") + delta };
          return updated;
        });
      });

      stream.on("error", (error) => {
        if (cancelled) return;
        toast.style = Toast.Style.Failure;
        toast.title = ALERT.title;
        toast.message = error instanceof Error ? error.message : "Unknown error occurred";
      });

      stream.finalMessage().then(() => {
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
  }, [question, transcript, questions, anthropicApiToken, anthropicModel, creativity, setQuestion, setQuestions]);
}
