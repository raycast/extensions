import { ActionPanel, Action, Icon, Detail, showToast, Toast, useNavigation, Form } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { getChatHistory, sendChatMessage, ChatMessage } from "./api";

interface ChatWithBookProps {
  launchContext?: {
    bookId?: string;
    bookTitle?: string;
  };
  arguments: {
    bookId: string;
    bookTitle?: string;
  };
}

// This was the markdown formatting for the Detail view
function formatMessagesToMarkdown(messages: ChatMessage[]): string {
  if (messages.length === 0) {
    return "No messages yet. Start the conversation!";
  }
  return messages
    .map((msg) => {
      const prefix = msg.role === "user" ? "**You:**" : "**Assistant:**";
      // Ensure markdown newlines are rendered correctly
      const textContent = msg.text.replace(/\n/g, "\n\n");
      return `${prefix}\n${textContent}\n\n----\n`; // Separator
    })
    .join("\n");
}

export default function ChatWithBookCommand(props: ChatWithBookProps) {
  const { push, pop } = useNavigation();
  const bookId = props.launchContext?.bookId || props.arguments.bookId;
  const bookTitle = props.launchContext?.bookTitle || props.arguments.bookTitle || "Book";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId) {
      setError("Book ID is missing.");
      showToast({ style: Toast.Style.Failure, title: "Error", message: "Book ID is missing." });
      setIsLoading(false);
      return;
    }
    async function loadHistory() {
      setIsLoading(true);
      setError(null);
      try {
        const history = await getChatHistory(bookId);
        setMessages(history);
      } catch (e: unknown) {
        if (e instanceof Error) {
          setError(e.message || `Failed to load chat history for ${bookTitle}`);
          showToast({ style: Toast.Style.Failure, title: "Error Loading History", message: e.message });
        } else {
          setError(`Failed to load chat history for ${bookTitle}`);
          showToast({
            style: Toast.Style.Failure,
            title: "Error Loading History",
            message: "An unknown error occurred",
          });
        }
      }
      setIsLoading(false);
    }
    loadHistory();
  }, [bookId, bookTitle]);

  const handleSendMessage = useCallback(
    async (inputText: string) => {
      if (!inputText.trim() || !bookId) return;

      const userMessage: ChatMessage = {
        id: String(Date.now()),
        role: "user",
        text: inputText.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Prepare for assistant's message (streaming)
      const assistantMessageId = `assistant-${Date.now()}`;
      let currentAssistantText = ""; // Start with empty or a placeholder like "...

      setMessages((prev) => [...prev, { id: assistantMessageId, role: "assistant", text: "▍", timestamp: new Date() }]);

      setIsSending(true);
      setError(null);
      pop(); // Close the input form

      try {
        for await (const update of sendChatMessage(bookId, userMessage.text)) {
          if (update.type === "status") {
            // Optionally update a specific part of the UI or the placeholder message
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId ? { ...msg, text: `${currentAssistantText}[${update.message}] ▍` } : msg,
              ),
            );
          } else if (update.type === "content") {
            currentAssistantText += update.chunk;
            setMessages((prev) =>
              prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, text: currentAssistantText + "▍" } : msg)),
            );
          } else if (update.type === "final") {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      text: update.fullText || currentAssistantText,
                      id: update.id || assistantMessageId,
                      timestamp: update.timestamp || new Date(),
                    }
                  : msg,
              ),
            );
            break; // Stream is fully processed
          } else if (update.type === "error") {
            setError(update.message || "Streaming error");
            showToast({ style: Toast.Style.Failure, title: "Streaming Error", message: update.message });
            // Remove or mark the placeholder assistant message as failed
            setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
            break;
          }
        }
      } catch (e: unknown) {
        console.error("Error processing stream in component:", e);
        if (e instanceof Error) {
          setError(e.message || "Failed to process stream.");
          showToast({ style: Toast.Style.Failure, title: "Error", message: e.message });
        } else {
          setError("Failed to process stream.");
          showToast({ style: Toast.Style.Failure, title: "Error", message: "An unknown error occurred" });
        }
        setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
      }
      setIsSending(false);
    },
    [bookId, pop], // Removed messages from here, as history isn't sent with each chunk to sendChatMessage
  );

  const baseMarkdown = formatMessagesToMarkdown(messages);

  // Modify Detail rendering slightly if error occurs during stream
  const detailMarkdown =
    error && messages.some((m) => m.id.startsWith("assistant-") && m.text.includes("▍"))
      ? `${formatMessagesToMarkdown(messages.filter((m) => !(m.id.startsWith("assistant-") && m.text.includes("▍"))))}\n\n---\n**Error receiving full response:** ${error}`
      : baseMarkdown;

  if (isLoading) {
    return <Detail isLoading={true} navigationTitle={`Chat with ${bookTitle}`} />;
  }

  if (error && messages.length === 0) {
    // Only show full error view if no messages to display
    return <Detail markdown={`# Error\n\n${error}`} navigationTitle={`Chat with ${bookTitle}`} />;
  }

  return (
    <Detail
      navigationTitle={`Chat with ${bookTitle}`}
      markdown={detailMarkdown}
      isLoading={isLoading || isSending} // Show loading for initial history and during streaming
      actions={
        <ActionPanel>
          <Action
            title="New Message"
            icon={Icon.SpeechBubble}
            onAction={() => push(<ChatMessageInputForm onSubmit={handleSendMessage} />)}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    />
  );
}

interface ChatMessageInputFormProps {
  onSubmit: (text: string) => Promise<void>;
}

function ChatMessageInputForm({ onSubmit }: ChatMessageInputFormProps) {
  const [messageText, setMessageText] = useState("");
  const { pop } = useNavigation();

  const handleSubmit = () => {
    if (!messageText.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Cannot send empty message" });
      return;
    }
    onSubmit(messageText);
    // onSubmit calls pop(), so no pop() here needed directly after onSubmit call.
  };

  return (
    <Form
      navigationTitle="Send Message"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send" onSubmit={handleSubmit} />
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="message"
        title="Your Message:"
        placeholder="Type your message here..."
        value={messageText}
        onChange={setMessageText}
        autoFocus={true}
      />
    </Form>
  );
}
