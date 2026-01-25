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
import { sendMessage } from "./api";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "clawdbot-conversations";

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
  const streamingRef = useRef("");
  const lastUpdateRef = useRef(0);
  const streamingTimestamp = useRef(Date.now());

  useEffect(() => {
    setCurrentConv(conversation);
  }, [conversation]);

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
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to send message",
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, currentConv, isLoading, onUpdate]);

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
    if (streamingContent) {
      return [
        {
          role: "assistant" as const,
          content: streamingContent,
          timestamp: streamingTimestamp.current,
          isStreaming: true,
        },
        ...displayMessages,
      ];
    }
    return displayMessages;
  }, [streamingContent, displayMessages]);

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
            <List.Item.Detail markdown="Type a message above and press **Enter** to start chatting with Clawdbot." />
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
            key={msg.isStreaming ? "streaming" : `${msg.timestamp}-${index}`}
            icon={msg.role === "user" ? Icon.Person : Icon.Stars}
            title={msg.role === "user" ? "You" : "Clawdbot"}
            subtitle={new Date(msg.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            detail={
              <List.Item.Detail
                markdown={`**${msg.role === "user" ? "You" : "Clawdbot"}**\n\n${msg.content}`}
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Send Message"
                  icon={Icon.Message}
                  onAction={handleSend}
                />
                <Action.CopyToClipboard
                  title="Copy This Message"
                  content={msg.content}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Full Conversation"
                  content={currentConv.messages
                    .map(
                      (m) =>
                        `${m.role === "user" ? "You" : "Clawdbot"}: ${m.content}`,
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
      saveConversations(newList);
      return newList;
    });
  }, []);

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
