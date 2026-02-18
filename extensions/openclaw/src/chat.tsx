import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { chatCompletionStream, ChatMessage } from "./api";

interface ConversationEntry {
  role: "user" | "assistant";
  content: string;
}

function formatConversation(
  conversation: ConversationEntry[],
  streamingText?: string,
): string {
  if (conversation.length === 0 && !streamingText) {
    return "# 🦞 OpenClaw Chat\n\nPress **Enter** or use the **Send Message** action to start chatting.";
  }

  const parts: string[] = [];
  for (const entry of conversation) {
    if (entry.role === "user") {
      parts.push(`### 🧑 You\n\n${entry.content}`);
    } else {
      parts.push(`### 🦞 OpenClaw\n\n${entry.content}`);
    }
  }

  if (streamingText !== undefined) {
    parts.push(`### 🦞 OpenClaw\n\n${streamingText || "⏳ Thinking..."}`);
  }

  return parts.join("\n\n---\n\n");
}

function MessageInput({ onSend }: { onSend: (text: string) => void }) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send Message"
            icon={Icon.Message}
            onSubmit={(values) => {
              const text = values.message as string;
              if (text.trim()) {
                onSend(text.trim());
                pop();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="message"
        title="Message"
        placeholder="Type your message..."
        autoFocus
      />
    </Form>
  );
}

export default function ChatWithOpenClaw() {
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState<string | undefined>(
    undefined,
  );
  const abortRef = useRef<AbortController | null>(null);
  const { push } = useNavigation();

  function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return;

    const userMessage: ConversationEntry = { role: "user", content: text };
    const updatedConversation = [...conversation, userMessage];
    setConversation(updatedConversation);
    setIsStreaming(true);
    setStreamingText("");

    const messages: ChatMessage[] = updatedConversation.map((entry) => ({
      role: entry.role,
      content: entry.content,
    }));

    abortRef.current = new AbortController();
    let fullText = "";

    chatCompletionStream(
      messages,
      (chunk) => {
        fullText += chunk;
        setStreamingText(fullText);
      },
      () => {
        setIsStreaming(false);
        setStreamingText(undefined);
        setConversation([
          ...updatedConversation,
          { role: "assistant", content: fullText },
        ]);
      },
      abortRef.current.signal,
    ).catch(async (error) => {
      if ((error as Error).name === "AbortError") return;
      setIsStreaming(false);
      setStreamingText(undefined);
      if (fullText) {
        setConversation([
          ...updatedConversation,
          { role: "assistant", content: fullText },
        ]);
      }
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to get response",
      });
    });
  }

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const markdown = formatConversation(conversation, streamingText);

  return (
    <Detail
      isLoading={isStreaming}
      markdown={markdown}
      actions={
        <ActionPanel>
          {!isStreaming && (
            <Action
              title="Send Message"
              icon={Icon.Message}
              onAction={() => push(<MessageInput onSend={sendMessage} />)}
            />
          )}
          {isStreaming && (
            <Action
              title="Stop Generating"
              icon={Icon.Stop}
              onAction={() => {
                abortRef.current?.abort();
                setIsStreaming(false);
                if (streamingText) {
                  setConversation([
                    ...conversation,
                    { role: "assistant", content: streamingText },
                  ]);
                }
                setStreamingText(undefined);
              }}
            />
          )}
          <Action
            title="Clear Conversation"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
            onAction={() => {
              abortRef.current?.abort();
              setConversation([]);
              setIsStreaming(false);
              setStreamingText(undefined);
              showToast({
                style: Toast.Style.Success,
                title: "Conversation cleared",
              });
            }}
          />
          {conversation.length > 0 && (
            <Action.CopyToClipboard
              title="Copy Conversation"
              content={conversation
                .map(
                  (e) =>
                    `${e.role === "user" ? "You" : "OpenClaw"}: ${e.content}`,
                )
                .join("\n\n")}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
