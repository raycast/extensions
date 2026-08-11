import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import { OLLAMA_MODEL } from "../../../const/defaults";
import { ALERT, FINDING_ANSWER } from "../../../const/toast_messages";
import type { Question } from "../../../hooks/useQuestions";
import type { OllamaPreferences } from "../../../summarizeVideoWithOllama";
import { generateQuestionId } from "../../../utils/generateQuestionId";
import { buildFollowUpMessages } from "../../../utils/getAiInstructionSnippets";
import { getOpenAIClient } from "../../../utils/sdkClients";

type FollowUpQuestionParams = {
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  setQuestion: React.Dispatch<React.SetStateAction<string>>;
  transcript: string | undefined;
  question: string;
  questions: Question[];
};

export function useOllamaFollowUpQuestion({
  setQuestions,
  setQuestion,
  transcript,
  question,
  questions,
}: FollowUpQuestionParams) {
  const preferences = getPreferenceValues() as OllamaPreferences;
  const { ollamaEndpoint, ollamaModel, creativity } = preferences;

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

      const openai = getOpenAIClient("ollama", ollamaEndpoint);

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

      const stream = openai.chat.completions.stream(
        {
          model: ollamaModel || OLLAMA_MODEL,
          messages,
          stream: true,
          temperature: Number.parseFloat(creativity),
        },
        { signal: abortController.signal },
      );

      stream.on("content", (delta) => {
        if (cancelled) return;
        toast.show();
        setQuestions((prevQuestions) => {
          const updated = prevQuestions.slice();
          updated[0] = { ...updated[0], answer: updated[0].answer + delta };
          return updated;
        });
      });

      stream.on("error", (error) => {
        if (cancelled) return;
        toast.style = Toast.Style.Failure;
        toast.title = ALERT.title;
        toast.message = error.message;
      });

      stream.finalChatCompletion().then(() => {
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
  }, [question, transcript, questions, creativity, ollamaEndpoint, ollamaModel, setQuestion, setQuestions]);
}
