import {
  Action,
  ActionPanel,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
  type LaunchProps,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadSessionHistory, sendSessionMessage } from "./api";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  isStreaming?: boolean;
};

type Conversation = {
  id: string;
  sessionKey?: string;
  agentId?: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
};

type ChatLaunchContext = {
  sessionKey?: string;
  agentId?: string;
  title?: string;
};

const STORAGE_KEY = "openclaw-conversations";
const MAX_CONVERSATIONS = 50;
const LEGACY_CONTEXT_MAX_CHARS = 24_000;

async function loadConversations(): Promise<Conversation[]> {
  const data = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!data) return [];

  try {
    return JSON.parse(data) as Conversation[];
  } catch {
    return [];
  }
}

async function saveConversations(conversations: Conversation[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

function messageForGateway(
  conversation: Conversation,
  messageText: string,
): string {
  if (conversation.sessionKey || conversation.messages.length === 0) {
    return messageText;
  }

  const transcript = conversation.messages
    .map(
      (message) =>
        `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`,
    )
    .join("\n\n")
    .slice(-LEGACY_CONTEXT_MAX_CHARS);

  return `Continue a conversation that was previously stored only in Raycast. Use the imported transcript as prior context, then answer the current user message.

Imported transcript:
${transcript}

Current user message:
${messageText}`;
}

function ConversationView({
  conversation,
  onUpdate,
}: {
  conversation: Conversation;
  onUpdate: (conversation: Conversation) => void;
}) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [currentConversation, setCurrentConversation] = useState(conversation);
  const historyLoadedFor = useRef<string | undefined>(undefined);

  useEffect(() => {
    const sessionKey = conversation.sessionKey;
    if (!sessionKey || historyLoadedFor.current === sessionKey) return;
    let active = true;
    setIsLoading(true);

    void (async () => {
      try {
        const messages = await loadSessionHistory(
          sessionKey,
          conversation.agentId,
        );
        if (!active) return;
        historyLoadedFor.current = sessionKey;
        const withHistory: Conversation = {
          ...conversation,
          messages,
          updatedAt: Date.now(),
        };
        setCurrentConversation(withHistory);
        onUpdate(withHistory);
      } catch (error) {
        if (!active) return;
        await showToast({
          style: Toast.Style.Failure,
          title: "Could Not Load Session History",
          message:
            error instanceof Error
              ? error.message
              : "OpenClaw did not respond.",
        });
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [
    conversation.agentId,
    conversation.id,
    conversation.sessionKey,
    onUpdate,
  ]);

  const handleSend = useCallback(async () => {
    const messageText = input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: messageText,
      timestamp: Date.now(),
    };
    const withUserMessage: Conversation = {
      ...currentConversation,
      title: currentConversation.title || messageText.slice(0, 50),
      messages: [...currentConversation.messages, userMessage],
      updatedAt: Date.now(),
    };

    setInput("");
    setIsLoading(true);
    setStreamingContent("");
    setCurrentConversation(withUserMessage);
    onUpdate(withUserMessage);

    try {
      const result = await sendSessionMessage(
        messageForGateway(currentConversation, messageText),
        {
          sessionKey: currentConversation.sessionKey,
          agentId: currentConversation.agentId,
          label: withUserMessage.title,
          onStream: setStreamingContent,
          onSession: (sessionKey) => {
            const linkedConversation = {
              ...withUserMessage,
              sessionKey,
            };
            setCurrentConversation(linkedConversation);
            onUpdate(linkedConversation);
          },
        },
      );
      const assistantMessage: Message = {
        role: "assistant",
        content: result.content,
        timestamp: Date.now(),
      };
      const completed: Conversation = {
        ...withUserMessage,
        sessionKey: result.sessionKey,
        messages: [...withUserMessage.messages, assistantMessage],
        updatedAt: Date.now(),
      };

      setCurrentConversation(completed);
      onUpdate(completed);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Send Message",
        message:
          error instanceof Error ? error.message : "OpenClaw did not respond.",
      });
    } finally {
      setStreamingContent("");
      setIsLoading(false);
    }
  }, [currentConversation, input, isLoading, onUpdate]);

  const lastAssistantMessage = [...currentConversation.messages]
    .reverse()
    .find((message) => message.role === "assistant");
  const displayMessages = useMemo(() => {
    const messages = [...currentConversation.messages].reverse();
    if (!streamingContent) return messages;

    return [
      {
        role: "assistant" as const,
        content: streamingContent,
        timestamp: Date.now(),
        isStreaming: true,
      },
      ...messages,
    ];
  }, [currentConversation.messages, streamingContent]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchBarPlaceholder="Type a message and press Enter…"
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
          {lastAssistantMessage ? (
            <Action.CopyToClipboard
              title="Copy Last Response"
              content={lastAssistantMessage.content}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          ) : null}
          {currentConversation.sessionKey ? (
            <Action.CopyToClipboard
              title="Copy OpenClaw Session Key"
              content={currentConversation.sessionKey}
            />
          ) : null}
        </ActionPanel>
      }
    >
      {displayMessages.length === 0 ? (
        <List.Item
          id="empty-conversation"
          title={
            currentConversation.sessionKey
              ? "Continue OpenClaw Session"
              : "Start a Conversation"
          }
          subtitle="Type above and press Enter"
          icon={Icon.Message}
          detail={
            <List.Item.Detail
              markdown={
                currentConversation.sessionKey
                  ? `No text messages were returned for OpenClaw session \`${currentConversation.sessionKey.replace(/`/g, "'")}\`. Your next message will continue it.`
                  : "Your first message creates a real OpenClaw Gateway session."
              }
            />
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
        displayMessages.map((message, index) => (
          <List.Item
            id={
              message.isStreaming
                ? "streaming"
                : `message:${message.timestamp}:${index}`
            }
            key={
              message.isStreaming
                ? "streaming"
                : `${message.timestamp}-${index}`
            }
            icon={message.role === "user" ? Icon.Person : Icon.Stars}
            title={message.role === "user" ? "You" : "OpenClaw"}
            subtitle={
              message.isStreaming
                ? "Responding…"
                : new Date(message.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
            }
            detail={
              <List.Item.Detail
                markdown={`**${message.role === "user" ? "You" : "OpenClaw"}**\n\n${message.content}`}
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
                  content={message.content}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action.CopyToClipboard
                  title="Copy Full Conversation"
                  content={currentConversation.messages
                    .map(
                      (item) =>
                        `${item.role === "user" ? "You" : "OpenClaw"}: ${item.content}`,
                    )
                    .join("\n\n")}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

export default function Command(props: LaunchProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const openedLaunchContext = useRef(false);
  const conversationWrites = useRef<Promise<void>>(Promise.resolve());
  const { push } = useNavigation();
  const launchContext = props.launchContext as ChatLaunchContext | undefined;

  useEffect(() => {
    loadConversations().then((data) => {
      setConversations(data);
      setIsLoading(false);
    });
  }, []);

  const updateConversation = useCallback((updated: Conversation) => {
    setConversations((current) => {
      const next = current.filter((item) => item.id !== updated.id);
      next.unshift(updated);
      return next.slice(0, MAX_CONVERSATIONS);
    });
  }, []);

  useEffect(() => {
    const sessionKey = launchContext?.sessionKey?.trim();
    if (isLoading || openedLaunchContext.current || !sessionKey) return;
    openedLaunchContext.current = true;

    const existing = conversations.find(
      (conversation) => conversation.sessionKey === sessionKey,
    );
    const linkedConversation: Conversation = existing
      ? {
          ...existing,
          agentId: existing.agentId ?? launchContext?.agentId?.trim(),
        }
      : ({
          id: generateId(),
          sessionKey,
          agentId: launchContext?.agentId?.trim(),
          title: launchContext?.title?.trim() || "OpenClaw Session",
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        } satisfies Conversation);

    if (!existing) {
      setConversations((current) => [linkedConversation, ...current]);
    }
    push(
      <ConversationView
        conversation={linkedConversation}
        onUpdate={updateConversation}
      />,
    );
  }, [conversations, isLoading, launchContext, push, updateConversation]);

  useEffect(() => {
    if (isLoading) return;

    const write = conversationWrites.current
      .catch(() => undefined)
      .then(() => saveConversations(conversations));
    conversationWrites.current = write;
    void write.catch((error: unknown) => {
      void showToast({
        style: Toast.Style.Failure,
        title: "Could Not Save Conversations",
        message:
          error instanceof Error ? error.message : "Local storage failed.",
      });
    });
  }, [conversations, isLoading]);

  function createNewConversation() {
    const newConversation: Conversation = {
      id: generateId(),
      title: "",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    push(
      <ConversationView
        conversation={newConversation}
        onUpdate={updateConversation}
      />,
    );
  }

  async function removeConversation(id: string) {
    setConversations((current) =>
      current.filter((conversation) => conversation.id !== id),
    );
    await showToast({
      style: Toast.Style.Success,
      title: "Removed from Raycast",
      message: "The OpenClaw session was not deleted.",
    });
  }

  return (
    <List isLoading={isLoading}>
      <List.Item
        id="new-conversation"
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
      {conversations.length ? (
        <List.Section title="Recent Conversations">
          {conversations.map((conversation) => (
            <List.Item
              id={`conversation:${conversation.id}`}
              key={conversation.id}
              icon={Icon.Message}
              title={conversation.title || "Untitled"}
              subtitle={`${conversation.messages.length} ${conversation.messages.length === 1 ? "message" : "messages"}`}
              accessories={[
                { text: new Date(conversation.updatedAt).toLocaleDateString() },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Open"
                    icon={Icon.ArrowRight}
                    onAction={() =>
                      push(
                        <ConversationView
                          conversation={conversation}
                          onUpdate={updateConversation}
                        />,
                      )
                    }
                  />
                  <Action
                    title="Remove from Raycast"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => removeConversation(conversation.id)}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
