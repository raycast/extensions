import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import OpenAI from "openai";
import { useEffect } from "react";
import { ALERT, FINDING_ANSWER } from "../../../const/toast_messages";
import { Question } from "../../../hooks/useQuestions";
import { OllamaPreferences } from "../../../summarizeVideoWithOllama";
import { generateQuestionId } from "../../../utils/generateQuestionId";
import { getFollowUpQuestionSnippet } from "../../../utils/getAiInstructionSnippets";

type FollowUpQuestionParams = {
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  setQuestion: React.Dispatch<React.SetStateAction<string>>;
  transcript: string | undefined;
  question: string;
};

export function useOllamaFollowUpQuestion({ setQuestions, setQuestion, transcript, question }: FollowUpQuestionParams) {
  useEffect(() => {
    const handleAdditionalQuestion = async () => {
      if (!question || !transcript) return;
      const qID = generateQuestionId();

      const preferences = getPreferenceValues() as OllamaPreferences;
      const { ollamaEndpoint, ollamaModel } = preferences;

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: FINDING_ANSWER.title,
        message: FINDING_ANSWER.message,
      });

      const openai = new OpenAI({
        baseURL: ollamaEndpoint,
        apiKey: "ollama", // Ollama doesn't require an API key
      });

      setQuestions((prevQuestions) => [
        {
          id: qID,
          question,
          answer: "",
        },
        ...prevQuestions,
      ]);

      const stream = openai.beta.chat.completions.stream({
        model: ollamaModel || "llama2",
        messages: [{ role: "user", content: getFollowUpQuestionSnippet(question, transcript) }],
        stream: true,
      });

      stream.on("content", (delta) => {
        toast.show();
        setQuestions((prevQuestions) =>
          prevQuestions.map((q) => (q.id === qID ? { ...q, answer: q.answer + delta } : q)),
        );
      });

      stream.finalChatCompletion().then(() => {
        toast.hide();
        setQuestion("");
      });

      stream.on("error", (error) => {
        toast.style = Toast.Style.Failure;
        toast.title = ALERT.title;
        toast.message = error.message;
      });
    };

    handleAdditionalQuestion();
  }, [question, transcript]);
}
