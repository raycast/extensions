import { useState, useCallback, useEffect, useRef } from "react";
import { Form, ActionPanel, Action, useNavigation, LaunchProps } from "@raycast/api";
import { useChat } from "./hooks/useChat";
import { QuickAIResult } from "./components/QuickAIResult";
import { createConversation, saveConversation, setCurrentConversationId } from "./utils/storage";
import { Message } from "./providers/base";

interface FormValues {
  question: string;
}

function AskForm({ onSubmit }: { onSubmit: (question: string) => void }) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask AI" onSubmit={(values: FormValues) => onSubmit(values.question)} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="question" title="Question" placeholder="Ask anything..." autoFocus enableMarkdown />
    </Form>
  );
}

function ResultView({ question }: { question: string }) {
  const { push } = useNavigation();
  const { streamingContent, isLoading, sendMessage } = useChat();
  const [response, setResponse] = useState("");
  const hasSent = useRef(false);
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;

  useEffect(() => {
    if (!hasSent.current) {
      hasSent.current = true;
      const userMessage: Message = { role: "user", content: question };
      sendMessageRef.current([userMessage]).then((assistantMsg) => {
        if (assistantMsg) {
          setResponse(assistantMsg.content);
        }
      });
    }
  }, [question]);

  // Show streaming while loading, then the final response
  const displayResponse = streamingContent || response;

  const handleContinueInChat = useCallback(async () => {
    const conversation = createConversation(question);
    conversation.messages = [{ role: "user", content: question }];
    if (displayResponse) {
      conversation.messages.push({
        role: "assistant",
        content: displayResponse,
      });
    }
    await saveConversation(conversation);
    await setCurrentConversationId(conversation.id);

    // Dynamic import to avoid circular dependency
    const { default: AIChat } = await import("./ai-chat");
    push(<AIChat />);
  }, [question, displayResponse, push]);

  return (
    <QuickAIResult
      question={question}
      response={displayResponse}
      isLoading={isLoading}
      onContinueInChat={handleContinueInChat}
    />
  );
}

export default function AskAI(props: LaunchProps<{ arguments: { question?: string } }>) {
  const [question, setQuestion] = useState<string | null>(props.arguments?.question ?? null);

  if (!question) {
    return <AskForm onSubmit={setQuestion} />;
  }

  return <ResultView question={question} />;
}
