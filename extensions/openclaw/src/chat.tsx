import {
  Action,
  ActionPanel,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  sendMessage,
  submitAsyncMessage,
  pollAsyncResult,
  AsyncResultResponse,
} from "./api";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  isPending?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

interface PendingMessage {
  runId: string;
  userMessage: Message;
  submittedAt: number;
}

const STORAGE_KEY = "openclaw-conversations";
const PENDING_KEY = "openclaw-pending-messages";
const MAX_CONVERSATIONS = 50;

async function loadConversations(): Promise<Conversation[]> {
  const data = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveConversations(conversations: Conversation[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

// Pending message storage for background processing
async function loadPendingMessages(): Promise<Record<string, PendingMessage>> {
  const data = await LocalStorage.getItem<string>(PENDING_KEY);
  if (!data) return {};
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function savePendingMessage(
  convId: string,
  pending: PendingMessage,
): Promise<void> {
  const all = await loadPendingMessages();
  all[convId] = pending;
  await LocalStorage.setItem(PENDING_KEY, JSON.stringify(all));
}

async function clearPendingMessage(convId: string): Promise<void> {
  const all = await loadPendingMessages();
  delete all[convId];
  await LocalStorage.setItem(PENDING_KEY, JSON.stringify(all));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function ConversationView({
  conversation,
  onUpdate,
}: {
  conversation: Conversation;
  onUpdate: (c: Conversation) => void;
}) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [currentConv, setCurrentConv] = useState(conversation);
  const [hasPending, setHasPending] = useState(false);
  const streamingRef = useRef("");
  const lastUpdateRef = useRef(0);
  const streamingTimestamp = useRef(Date.now());
  const pollingRef = useRef(false);
  const currentConvRef = useRef(currentConv);
  const pollTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    currentConvRef.current = currentConv;
  }, [currentConv]);

  useEffect(() => {
    setCurrentConv(conversation);
  }, [conversation]);

  // Cleanup all poll timers on unmount
  useEffect(() => {
    return () => {
      pollTimersRef.current.forEach(clearTimeout);
      pollTimersRef.current = [];
      pollingRef.current = false;
    };
  }, []);

  // Check for pending responses on mount and poll for completion
  useEffect(() => {
    let cancelled = false;

    const checkPendingResponse = async () => {
      const pending = await loadPendingMessages();
      const convId = currentConvRef.current.id;
      const myPending = pending[convId];

      if (cancelled) return;

      if (myPending) {
        setHasPending(true);

        // Poll for result
        const result = await pollAsyncResult(myPending.runId);

        if (cancelled) return;

        if (result.status === "complete" && result.content) {
          const assistantMessage: Message = {
            role: "assistant",
            content: result.content,
            timestamp: Date.now(),
          };

          setCurrentConv((prev) => {
            const updatedConv = {
              ...prev,
              messages: [...prev.messages, assistantMessage],
              updatedAt: Date.now(),
            };
            onUpdate(updatedConv);
            return updatedConv;
          });

          await clearPendingMessage(convId);
          setHasPending(false);

          showToast({
            style: Toast.Style.Success,
            title: "Response received",
            message: "OpenClaw's response has arrived",
          });
        } else if (result.status === "error") {
          await clearPendingMessage(convId);
          setHasPending(false);

          showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: result.error || "Failed to get response",
          });
        }
        // If still pending, keep hasPending true - will check again on next open
      } else {
        setHasPending(false);
      }
    };

    checkPendingResponse();

    return () => {
      cancelled = true;
    };
  }, [currentConv.id, onUpdate]);

  // Non-blocking poll with retry for background responses
  const pollForResponse = useCallback(
    async (runId: string, convId: string) => {
      if (pollingRef.current) return;
      pollingRef.current = true;

      const maxAttempts = 60; // 5 minutes at 5s intervals
      let attempts = 0;

      const poll = async () => {
        if (attempts >= maxAttempts) {
          pollingRef.current = false;
          return;
        }
        attempts++;

        try {
          const result: AsyncResultResponse = await pollAsyncResult(runId);

          if (result.status === "complete" && result.content) {
            const assistantMessage: Message = {
              role: "assistant",
              content: result.content,
              timestamp: Date.now(),
            };

            setCurrentConv((prev) => {
              const updated = {
                ...prev,
                messages: [...prev.messages, assistantMessage],
                updatedAt: Date.now(),
              };
              onUpdate(updated);
              return updated;
            });

            await clearPendingMessage(convId);
            setHasPending(false);
            setIsLoading(false);
            pollingRef.current = false;

            showToast({
              style: Toast.Style.Success,
              title: "Response received",
            });
          } else if (result.status === "error") {
            await clearPendingMessage(convId);
            setHasPending(false);
            setIsLoading(false);
            pollingRef.current = false;

            showToast({
              style: Toast.Style.Failure,
              title: "Error",
              message: result.error || "Failed to get response",
            });
          } else if (result.status === "pending") {
            const tid = setTimeout(poll, 5000); // Retry in 5s
            pollTimersRef.current.push(tid);
          }
        } catch {
          const tid = setTimeout(poll, 5000); // Retry on network error
          pollTimersRef.current.push(tid);
        }
      };

      const tid = setTimeout(poll, 2000); // First check after 2s
      pollTimersRef.current.push(tid);
    },
    [onUpdate],
  );

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const messageText = input.trim();
    setInput(""); // Clear input immediately

    const userMessage: Message = {
      role: "user",
      content: messageText,
      timestamp: Date.now(),
    };

    const updatedMessages = [...currentConv.messages, userMessage];
    const updatedConversation: Conversation = {
      ...currentConv,
      messages: updatedMessages,
      updatedAt: Date.now(),
      title: currentConv.title || messageText.slice(0, 50),
    };

    setCurrentConv(updatedConversation);
    onUpdate(updatedConversation);
    setIsLoading(true);
    setStreamingContent("");
    streamingRef.current = "";
    lastUpdateRef.current = 0;
    streamingTimestamp.current = Date.now();

    try {
      const apiMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Try async submission first for background processing support
      try {
        const runId = await submitAsyncMessage(apiMessages, currentConv.id);

        // Save pending state so response can be retrieved later
        await savePendingMessage(currentConv.id, {
          runId,
          userMessage,
          submittedAt: Date.now(),
        });
        setHasPending(true);

        showToast({
          style: Toast.Style.Success,
          title: "Message sent",
          message: "OpenClaw is thinking... You can close Raycast.",
        });

        // Start polling in background (non-blocking)
        pollForResponse(runId, currentConv.id);
      } catch {
        // Fallback to synchronous streaming if async endpoint unavailable
        let fullResponse = "";
        await sendMessage(apiMessages, (chunk) => {
          fullResponse += chunk;
          streamingRef.current = fullResponse;

          // Throttle UI updates to every 100ms to prevent flickering
          const now = Date.now();
          if (now - lastUpdateRef.current > 100) {
            lastUpdateRef.current = now;
            setStreamingContent(fullResponse);
          }
        });

        // Final update to ensure all content is shown
        setStreamingContent(fullResponse);

        const assistantMessage: Message = {
          role: "assistant",
          content: fullResponse,
          timestamp: Date.now(),
        };

        const finalConversation: Conversation = {
          ...updatedConversation,
          messages: [...updatedMessages, assistantMessage],
          updatedAt: Date.now(),
        };

        setCurrentConv(finalConversation);
        onUpdate(finalConversation);
        setStreamingContent("");
        setIsLoading(false);
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to send message",
      });
      setIsLoading(false);
    }
  }, [input, currentConv, isLoading, onUpdate, pollForResponse]);

  const lastAssistantMessage = [...currentConv.messages]
    .reverse()
    .find((m) => m.role === "assistant");

  // Memoize reversed messages to prevent unnecessary re-renders
  const displayMessages = useMemo(
    () => [...currentConv.messages].reverse(),
    [currentConv.messages],
  );

  // Memoize the combined messages array
  const allMessages = useMemo(() => {
    const messages = [...displayMessages];

    // Show streaming content at the top if available
    if (streamingContent) {
      return [
        {
          role: "assistant" as const,
          content: streamingContent,
          timestamp: streamingTimestamp.current,
          isStreaming: true,
          isPending: false,
        },
        ...messages,
      ];
    }

    // Show pending indicator at the top if waiting for background response
    if (hasPending && !streamingContent) {
      return [
        {
          role: "assistant" as const,
          content:
            "⏳ *Awaiting response...*\n\nYou can close Raycast. The response will appear when you return.",
          timestamp: Date.now(),
          isStreaming: false,
          isPending: true,
        },
        ...messages,
      ];
    }

    return messages;
  }, [streamingContent, displayMessages, hasPending]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchBarPlaceholder="Type a message and press Enter..."
      searchText={input}
      onSearchTextChange={setInput}
      isShowingDetail
      actions={
        <ActionPanel>
          <Action
            title="Send Message"
            icon={Icon.Message}
            onAction={handleSend}
          />
          {lastAssistantMessage && (
            <Action.CopyToClipboard
              title="Copy Last Response"
              content={lastAssistantMessage.content}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    >
      {allMessages.length === 0 ? (
        <List.Item
          title="Start a conversation"
          subtitle="Type above and press Enter"
          icon={Icon.Message}
          detail={
            <List.Item.Detail markdown="Type a message above and press **Enter** to start chatting with OpenClaw." />
          }
          actions={
            <ActionPanel>
              <Action
                title="Send Message"
                icon={Icon.Message}
                onAction={handleSend}
              />
            </ActionPanel>
          }
        />
      ) : (
        allMessages.map((msg, index) => (
          <List.Item
            key={
              msg.isPending
                ? "pending"
                : msg.isStreaming
                  ? "streaming"
                  : `${msg.timestamp}-${index}`
            }
            icon={
              msg.isPending
                ? Icon.Clock
                : msg.role === "user"
                  ? Icon.Person
                  : Icon.Stars
            }
            title={msg.role === "user" ? "You" : "OpenClaw"}
            subtitle={
              msg.isPending
                ? "Thinking..."
                : new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
            }
            detail={
              <List.Item.Detail
                markdown={`**${msg.role === "user" ? "You" : "OpenClaw"}**\n\n${msg.content}`}
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Send Message"
                  icon={Icon.Message}
                  onAction={handleSend}
                />
                {!msg.isPending && (
                  <Action.CopyToClipboard
                    title="Copy This Message"
                    content={msg.content}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                )}
                <Action.CopyToClipboard
                  title="Copy Full Conversation"
                  content={currentConv.messages
                    .map(
                      (m) =>
                        `${m.role === "user" ? "You" : "OpenClaw"}: ${m.content}`,
                    )
                    .join("\n\n")}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

export default function Command() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    loadConversations().then((data) => {
      setConversations(data);
      setIsLoading(false);
    });
  }, []);

  const updateConversation = useCallback(async (updated: Conversation) => {
    setConversations((prev) => {
      const newList = prev.filter((c) => c.id !== updated.id);
      newList.unshift(updated);
      return newList.slice(0, MAX_CONVERSATIONS);
    });
  }, []);

  // Persist conversations to storage whenever they change
  useEffect(() => {
    if (!isLoading) {
      saveConversations(conversations);
    }
  }, [conversations, isLoading]);

  function createNewConversation() {
    const newConv: Conversation = {
      id: generateId(),
      title: "",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    push(
      <ConversationView conversation={newConv} onUpdate={updateConversation} />,
    );
  }

  async function deleteConversation(id: string) {
    const newList = conversations.filter((c) => c.id !== id);
    setConversations(newList);
    await saveConversations(newList);
    showToast({ style: Toast.Style.Success, title: "Conversation deleted" });
  }

  function openConversation(conv: Conversation) {
    push(
      <ConversationView conversation={conv} onUpdate={updateConversation} />,
    );
  }

  return (
    <List isLoading={isLoading}>
      <List.Item
        icon={Icon.Plus}
        title="New Conversation"
        actions={
          <ActionPanel>
            <Action
              title="Start New Chat"
              icon={Icon.Message}
              onAction={createNewConversation}
            />
          </ActionPanel>
        }
      />
      {conversations.length > 0 && (
        <List.Section title="Recent Conversations">
          {conversations.map((conv) => (
            <List.Item
              key={conv.id}
              icon={Icon.Message}
              title={conv.title || "Untitled"}
              subtitle={`${conv.messages.length} messages`}
              accessories={[
                {
                  text: new Date(conv.updatedAt).toLocaleDateString(),
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Open"
                    icon={Icon.ArrowRight}
                    onAction={() => openConversation(conv)}
                  />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => deleteConversation(conv.id)}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
