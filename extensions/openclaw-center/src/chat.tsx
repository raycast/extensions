import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
  Color,
} from "@raycast/api";
import { useEffect, useState, useCallback, useRef } from "react";
import { getGatewayClient } from "./lib/gateway-client";
import type { ChatMessage, ChatEvent } from "./lib/types";

function extractTextContent(message: ChatMessage): string {
  let text = "";
  for (const content of message.content) {
    if (content.type === "text") {
      text += content.text;
    } else if (content.type === "tool_use") {
      text += ` [Tool: ${content.name}]`;
    }
  }
  return text.trim();
}

function formatMessageForDisplay(text: string): string {
  const trimmed = text.trim();
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      const parsed = JSON.parse(trimmed);
      return "```json\n" + JSON.stringify(parsed, null, 2) + "\n```";
    } catch {
      // Not valid JSON
    }
  }
  return text;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

interface StreamingState {
  status: "idle" | "sending" | "streaming" | "done" | "error";
  userMessage?: string;
  response?: string;
  error?: string;
  runId?: string;
}

// Unified chat view - compose and messages in one place
function ChatView({ sessionKey }: { sessionKey: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchText, setSearchText] = useState("");
  const [streaming, setStreaming] = useState<StreamingState>({
    status: "idle",
  });
  const { push } = useNavigation();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const client = getGatewayClient();
      await client.connect();
      const result = await client.chatHistory(sessionKey, 100);
      setMessages(result.messages || []);
      setLoading(false);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
      setLoading(false);
    }
  }, [sessionKey]);

  useEffect(() => {
    loadHistory();
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [loadHistory]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Enter a message" });
      return;
    }

    const messageToSend = text.trim();
    setSearchText(""); // Clear input
    setStreaming({ status: "sending", userMessage: messageToSend });

    showToast({ style: Toast.Style.Animated, title: "Sending to OpenClaw..." });

    try {
      const client = getGatewayClient();
      await client.connect();

      // Subscribe to chat events
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }

      unsubscribeRef.current = client.onEvent("chat", (event) => {
        const payload = event.payload as ChatEvent;
        if (payload.sessionKey !== sessionKey) return;

        if (
          (payload.state === "streaming" || payload.state === "delta") &&
          payload.message
        ) {
          setStreaming((s) => ({
            ...s,
            status: "streaming",
            response: extractTextContent(payload.message!),
            runId: payload.runId,
          }));
        } else if (payload.state === "final") {
          const finalText = payload.message
            ? extractTextContent(payload.message)
            : "";
          showToast({ style: Toast.Style.Success, title: "Response received" });
          setStreaming((s) => ({
            ...s,
            status: "done",
            response: finalText || s.response,
          }));
          loadHistory();
        } else if (payload.state === "error") {
          showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: payload.errorMessage,
          });
          setStreaming({
            status: "error",
            userMessage: messageToSend,
            error: payload.errorMessage || "Unknown error",
          });
        }
      });

      const result = await client.chatSend({
        sessionKey,
        message: messageToSend,
        deliver: true,
        idempotencyKey: `raycast-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      });

      if (result.status === "error") {
        showToast({ style: Toast.Style.Failure, title: "Failed to send" });
        setStreaming({
          status: "error",
          userMessage: messageToSend,
          error: "Failed to send",
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to send";
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: errorMsg,
      });
      setStreaming({
        status: "error",
        userMessage: messageToSend,
        error: errorMsg,
      });
    }
  };

  const stopResponse = async () => {
    try {
      const client = getGatewayClient();
      await client.chatAbort(sessionKey, streaming.runId);
      setStreaming({ status: "idle" });
      loadHistory();
      showToast({ style: Toast.Style.Success, title: "Stopped" });
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Failed to stop" });
    }
  };

  if (error && !messages.length) {
    return (
      <Detail
        markdown={`# Connection Error\n\n${error}\n\nMake sure OpenClaw is running.`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={loadHistory}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Show last 20 messages, newest first
  const recentMessages = messages.slice(-20).reverse();
  const isActive =
    streaming.status === "sending" || streaming.status === "streaming";
  const showCurrentSection = streaming.status !== "idle";

  return (
    <List
      isLoading={loading || isActive}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Type a message and press Enter to send..."
      throttle
    >
      {/* Active streaming/pending section */}
      {showCurrentSection && (
        <List.Section title="Current">
          {/* Show user's message that was sent */}
          {streaming.userMessage && (
            <List.Item
              icon={{ source: Icon.PersonCircle, tintColor: Color.Blue }}
              title="You"
              subtitle={truncate(streaming.userMessage, 150)}
              accessories={[{ tag: { value: "sent", color: Color.Blue } }]}
            />
          )}

          {/* Show streaming response or status */}
          {streaming.status === "sending" && (
            <List.Item
              icon={{ source: Icon.Stars, tintColor: Color.Purple }}
              title="OpenClaw"
              subtitle="Thinking..."
              accessories={[{ tag: { value: "...", color: Color.Orange } }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Stop"
                    icon={Icon.Stop}
                    onAction={stopResponse}
                  />
                </ActionPanel>
              }
            />
          )}

          {streaming.status === "streaming" && streaming.response && (
            <List.Item
              icon={{ source: Icon.Stars, tintColor: Color.Purple }}
              title="OpenClaw"
              subtitle={truncate(streaming.response, 150)}
              accessories={[
                { tag: { value: "typing...", color: Color.Orange } },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="View Response"
                    icon={Icon.Eye}
                    onAction={() =>
                      push(
                        <Detail
                          markdown={`## OpenClaw\n\n${formatMessageForDisplay(streaming.response || "")}`}
                          actions={
                            <ActionPanel>
                              <Action
                                title="Stop"
                                icon={Icon.Stop}
                                onAction={stopResponse}
                              />
                            </ActionPanel>
                          }
                        />,
                      )
                    }
                  />
                  <Action
                    title="Stop"
                    icon={Icon.Stop}
                    onAction={stopResponse}
                  />
                </ActionPanel>
              }
            />
          )}

          {streaming.status === "done" && streaming.response && (
            <List.Item
              icon={{ source: Icon.Stars, tintColor: Color.Green }}
              title="OpenClaw"
              subtitle={truncate(streaming.response, 150)}
              accessories={[{ tag: { value: "done", color: Color.Green } }]}
              actions={
                <ActionPanel>
                  <Action
                    title="View Full Response"
                    icon={Icon.Eye}
                    onAction={() =>
                      push(
                        <Detail
                          navigationTitle="OpenClaw Response"
                          markdown={`## Your Message\n\n> ${streaming.userMessage}\n\n---\n\n## OpenClaw\n\n${formatMessageForDisplay(streaming.response || "")}`}
                          actions={
                            <ActionPanel>
                              <Action
                                title="Done"
                                icon={Icon.Checkmark}
                                onAction={() => {
                                  setStreaming({ status: "idle" });
                                }}
                              />
                              <Action.CopyToClipboard
                                title="Copy Response"
                                content={streaming.response || ""}
                              />
                            </ActionPanel>
                          }
                        />,
                      )
                    }
                  />
                  <Action
                    title="Dismiss"
                    icon={Icon.Checkmark}
                    onAction={() => setStreaming({ status: "idle" })}
                  />
                  <Action.CopyToClipboard
                    title="Copy Response"
                    content={streaming.response || ""}
                  />
                </ActionPanel>
              }
            />
          )}

          {streaming.status === "error" && (
            <List.Item
              icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
              title="Error"
              subtitle={streaming.error}
              accessories={[{ tag: { value: "failed", color: Color.Red } }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Retry"
                    icon={Icon.ArrowClockwise}
                    onAction={() =>
                      streaming.userMessage &&
                      sendMessage(streaming.userMessage)
                    }
                  />
                  <Action
                    title="Dismiss"
                    icon={Icon.XMarkCircle}
                    onAction={() => setStreaming({ status: "idle" })}
                  />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      )}

      {/* Send action - shown when there's text in search bar */}
      {searchText.trim() && streaming.status === "idle" && (
        <List.Section title="Send">
          <List.Item
            icon={{ source: Icon.Message, tintColor: Color.Green }}
            title={`Send: "${truncate(searchText, 50)}"`}
            actions={
              <ActionPanel>
                <Action
                  title="Send Message"
                  icon={Icon.Message}
                  onAction={() => sendMessage(searchText)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* Recent messages */}
      <List.Section title="Recent" subtitle={`${messages.length} messages`}>
        {recentMessages.length === 0 && streaming.status === "idle" ? (
          <List.Item
            icon={Icon.Message}
            title="No messages yet"
            subtitle="Type above to start chatting"
          />
        ) : (
          recentMessages.map((msg, index) => {
            const text = extractTextContent(msg);
            const isUser = msg.role === "user";
            const originalIndex =
              messages.length - 1 - (recentMessages.length - 1 - index);

            return (
              <List.Item
                key={`msg-${originalIndex}`}
                icon={
                  isUser
                    ? { source: Icon.PersonCircle, tintColor: Color.Blue }
                    : { source: Icon.Stars, tintColor: Color.Purple }
                }
                title={isUser ? "You" : "OpenClaw"}
                subtitle={truncate(text, 150)}
                accessories={[
                  {
                    tag: {
                      value: isUser ? "sent" : "received",
                      color: isUser ? Color.Blue : Color.Purple,
                    },
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="View Message"
                      icon={Icon.Eye}
                      onAction={() =>
                        push(
                          <Detail
                            navigationTitle={
                              isUser ? "Your Message" : "OpenClaw Response"
                            }
                            markdown={`## ${isUser ? "You" : "OpenClaw"}\n\n${formatMessageForDisplay(text)}`}
                            metadata={
                              <Detail.Metadata>
                                <Detail.Metadata.Label
                                  title="From"
                                  text={isUser ? "You" : "OpenClaw"}
                                />
                                <Detail.Metadata.TagList title="Type">
                                  <Detail.Metadata.TagList.Item
                                    text={isUser ? "Sent" : "Received"}
                                    color={isUser ? Color.Blue : Color.Purple}
                                  />
                                </Detail.Metadata.TagList>
                              </Detail.Metadata>
                            }
                            actions={
                              <ActionPanel>
                                <Action.CopyToClipboard
                                  title="Copy"
                                  content={text}
                                />
                              </ActionPanel>
                            }
                          />,
                        )
                      }
                    />
                    <Action.CopyToClipboard title="Copy" content={text} />
                    {searchText.trim() && (
                      <Action
                        title="Send Message"
                        icon={Icon.Message}
                        shortcut={{ modifiers: ["cmd"], key: "return" }}
                        onAction={() => sendMessage(searchText)}
                      />
                    )}
                    <Action
                      title="View All History"
                      icon={Icon.List}
                      shortcut={{ modifiers: ["cmd"], key: "h" }}
                      onAction={() =>
                        push(
                          <FullHistoryList
                            sessionKey={sessionKey}
                            messages={messages}
                          />,
                        )
                      }
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={loadHistory}
                    />
                  </ActionPanel>
                }
              />
            );
          })
        )}
      </List.Section>
    </List>
  );
}

// Full history list
function FullHistoryList({
  sessionKey,
  messages,
}: {
  sessionKey: string;
  messages: ChatMessage[];
}) {
  const { pop, push } = useNavigation();
  const reversed = [...messages].reverse();

  return (
    <List
      navigationTitle={`All Messages - ${sessionKey}`}
      searchBarPlaceholder="Search messages..."
    >
      {reversed.length === 0 ? (
        <List.EmptyView
          title="No Messages"
          description="Start a conversation"
          icon={Icon.Message}
        />
      ) : (
        reversed.map((msg, index) => {
          const text = extractTextContent(msg);
          const isUser = msg.role === "user";
          const originalIndex = messages.length - 1 - index;

          return (
            <List.Item
              key={`hist-${originalIndex}`}
              icon={
                isUser
                  ? { source: Icon.PersonCircle, tintColor: Color.Blue }
                  : { source: Icon.Stars, tintColor: Color.Purple }
              }
              title={isUser ? "You" : "OpenClaw"}
              subtitle={truncate(text, 150)}
              accessories={[
                {
                  tag: {
                    value: isUser ? "sent" : "received",
                    color: isUser ? Color.Blue : Color.Purple,
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="View Message"
                    icon={Icon.Eye}
                    onAction={() =>
                      push(
                        <Detail
                          markdown={`## ${isUser ? "You" : "OpenClaw"}\n\n${formatMessageForDisplay(text)}`}
                          actions={
                            <ActionPanel>
                              <Action.CopyToClipboard
                                title="Copy"
                                content={text}
                              />
                            </ActionPanel>
                          }
                        />,
                      )
                    }
                  />
                  <Action.CopyToClipboard title="Copy" content={text} />
                  <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

export default function ChatCommand() {
  // Use canonical session key form to match gateway's internal resolution
  return <ChatView sessionKey="agent:main:main" />;
}
