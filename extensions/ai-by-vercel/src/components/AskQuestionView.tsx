import { Detail, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useCallback, useMemo } from "react";
import type { Conversation, FormValues, Message } from "../types";
import { streamAIResponse } from "../services/ai";
import { ConversationDetailView } from "./ConversationDetailView";
import { QuestionForm } from "./QuestionForm";
import { STREAMING_CURSOR, NAVIGATION_DELAY } from "../constants";

interface AskQuestionViewProps {
  initialQuestion?: string;
  addConversation: (conversation: Conversation) => Promise<void>;
  updateConversation: (id: string, updates: Partial<Conversation>) => Promise<void>;
}

type ViewState = "form" | "streaming";

export function AskQuestionView({ initialQuestion = "", addConversation, updateConversation }: AskQuestionViewProps) {
  const [viewState, setViewState] = useState<ViewState>("form");
  const [userQuestion, setUserQuestion] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { push, pop } = useNavigation();

  const generateResponse = useCallback(
    async (question: string, selectedModel?: string) => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Generating response...",
      });

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

        pop();
        await new Promise((resolve) => setTimeout(resolve, NAVIGATION_DELAY));
        push(<ConversationDetailView conversation={newConversation} updateConversation={updateConversation} />);
      } catch (error) {
        console.error("Error:", error);
        setIsGenerating(false);
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to get response";
        toast.message = "Please verify the model name is correct or try again later if requests are too frequent.";
        setViewState("form");
      }
    },
    [addConversation, updateConversation, pop, push],
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

  if (viewState === "form") {
    return (
      <QuestionForm
        navigationTitle="New Conversation"
        questionTitle="Question"
        questionPlaceholder="Enter your question here..."
        defaultQuestion={initialQuestion}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <Detail markdown={displayMarkdown} isLoading={isGenerating && !streamingText} navigationTitle={userQuestion} />
  );
}
