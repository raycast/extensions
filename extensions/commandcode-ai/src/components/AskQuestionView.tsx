import { Detail, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useCallback, useMemo } from "react";
import type { Conversation, FormValues, Message } from "../types";
import { streamAIResponse } from "../services/ai";
import { ConversationDetailView } from "./ConversationDetailView";
import { QuestionForm } from "./QuestionForm";
import { STREAMING_CURSOR } from "../constants";

interface AskQuestionViewProps {
  initialQuestion?: string;
  addConversation: (conversation: Conversation) => Promise<void>;
  updateConversation: (id: string, update: (saved: Conversation) => Partial<Conversation>) => Promise<void>;
}

type ViewState = "form" | "streaming";

export function AskQuestionView({ initialQuestion = "", addConversation, updateConversation }: AskQuestionViewProps) {
  const [viewState, setViewState] = useState<ViewState>("form");
  const [userQuestion, setUserQuestion] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [conversation, setConversation] = useState<Conversation>();

  const generateResponse = useCallback(
    async (question: string, selectedModel?: string) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Generating response..." });

      try {
        const messages: Message[] = [{ role: "user", content: question }];

        const { fullResponse, model } = await streamAIResponse(messages, setStreamingText, selectedModel);

        const newConversation: Conversation = {
          id: Date.now().toString(),
          title: question,
          messages: [...messages, { role: "assistant", content: fullResponse }],
          timestamp: Date.now(),
          model,
        };

        await addConversation(newConversation);

        setIsGenerating(false);
        toast.style = Toast.Style.Success;
        toast.title = "Response completed";
        // Swap to the chat in place rather than pop/push, so a user who already left isn't navigated.
        setConversation(newConversation);
      } catch (error) {
        console.error("Error:", error);
        setIsGenerating(false);
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to get response";
        toast.message = error instanceof Error ? error.message : "Please check your CommandCode API key and try again.";
        setViewState("form");
      }
    },
    [addConversation],
  );

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      const question = values.question.trim();

      if (!question) {
        await showFailureToast("Please enter a question");
        return;
      }

      setUserQuestion(question);
      setViewState("streaming");
      setIsGenerating(true);
      setStreamingText("");

      await generateResponse(question, values.model);
    },
    [generateResponse],
  );

  const displayMarkdown = useMemo(
    () => `# ${userQuestion}\n\n${streamingText}${isGenerating ? STREAMING_CURSOR : ""}`,
    [userQuestion, streamingText, isGenerating],
  );

  if (conversation) {
    return <ConversationDetailView conversation={conversation} updateConversation={updateConversation} />;
  }

  if (viewState === "form") {
    return (
      <QuestionForm
        navigationTitle="New Conversation"
        questionTitle="Question"
        questionPlaceholder="Ask CommandCode AI anything…"
        defaultQuestion={userQuestion || initialQuestion}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <Detail markdown={displayMarkdown} isLoading={isGenerating && !streamingText} navigationTitle={userQuestion} />
  );
}
