import {
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
  openExtensionPreferences,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import {
  listAgentChats,
  getChatMessages,
  sendAgentMessage,
  pollForAgentReply,
  type Chat,
  type ChatMessage,
} from "./lib/bookface";
import { hasCredentials } from "./lib/auth";

export default function Command() {
  if (!hasCredentials()) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Lock}
          title="Bookface Login Required"
          description="Set your YC username and password in extension preferences."
          actions={
            <ActionPanel>
              <Action
                title="Open Preferences"
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return <AgentChat />;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface QAPair {
  id: number;
  question: string;
  answer: string;
  answeredAt?: string;
  isLoading: boolean;
}

function AgentChat() {
  const [query, setQuery] = useState("");
  const [pairs, setPairs] = useState<QAPair[]>([]);
  const [chatId, setChatId] = useState<number | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [selectedChat, setSelectedChat] = useState<string>("new");
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(
    undefined,
  );

  // Load chat list
  useEffect(() => {
    listAgentChats()
      .then((c) => {
        setChats(c);
        setIsLoadingChats(false);
      })
      .catch(() => setIsLoadingChats(false));
  }, []);

  function loadChat(id: number) {
    getChatMessages(id)
      .then((messages) => {
        const qaPairs: QAPair[] = [];
        let currentQ: ChatMessage | null = null;

        for (const m of messages) {
          if (m.type === "user") {
            currentQ = m;
          } else if (m.type === "assistant" && currentQ) {
            qaPairs.push({
              id: m.id,
              question: currentQ.content,
              answer: m.content,
              answeredAt: m.created_at,
              isLoading: false,
            });
            currentQ = null;
          }
        }
        if (currentQ) {
          qaPairs.push({
            id: currentQ.id,
            question: currentQ.content,
            answer: "",
            isLoading: true,
          });
        }
        setPairs(qaPairs);
        if (qaPairs.length > 0) {
          const lastId = String(qaPairs[qaPairs.length - 1].id);
          setSelectedItemId(lastId);
        }
      })
      .catch((e) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load chat",
          message: String(e),
        });
      });
  }

  // Load messages when switching conversations
  useEffect(() => {
    if (selectedChat === "new") {
      setPairs([]);
      setChatId(null);
      return;
    }

    const id = Number(selectedChat);
    setChatId(id);
    loadChat(id);
  }, [selectedChat]);

  const handleSubmit = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const question = text.trim();
      setQuery("");

      // Add loading pair
      const tempId = Date.now();
      setPairs((prev) => [
        ...prev,
        { id: tempId, question, answer: "", isLoading: true },
      ]);

      try {
        showToast({ style: Toast.Style.Animated, title: "Asking YC Agent..." });

        // Get the latest message id before sending so we can poll after it
        let lastMsgId = 0;
        if (chatId) {
          const before = await getChatMessages(chatId);
          lastMsgId = before.length > 0 ? before[before.length - 1].id : 0;
        }

        const result = await sendAgentMessage(question, chatId ?? undefined);
        const newChatId = result.chatId;

        // For new chats, get the last message id (our sent message)
        if (!chatId) {
          const msgs = await getChatMessages(newChatId);
          lastMsgId = msgs.length > 0 ? msgs[msgs.length - 1].id : 0;
        }

        // Poll for reply
        await pollForAgentReply(newChatId, lastMsgId);

        showToast({ style: Toast.Style.Success, title: "Agent replied" });

        // Refresh chat list and reload conversation
        listAgentChats()
          .then(setChats)
          .catch(() => {});
        setChatId(newChatId);
        if (selectedChat !== String(newChatId)) {
          setSelectedChat(String(newChatId));
        } else {
          // Same chat - useEffect won't fire, reload manually
          loadChat(newChatId);
        }
      } catch (e) {
        setPairs((prev) =>
          prev.map((p) =>
            p.id === tempId
              ? { ...p, answer: `Error: ${e}`, isLoading: false }
              : p,
          ),
        );
        showToast({
          style: Toast.Style.Failure,
          title: "Failed",
          message: String(e),
        });
      }
    },
    [chatId, selectedChat],
  );

  const hasMessages = pairs.length > 0;

  return (
    <List
      isLoading={isLoadingChats}
      isShowingDetail={hasMessages}
      selectedItemId={selectedItemId}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Ask the YC Agent..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Conversation"
          value={selectedChat}
          onChange={setSelectedChat}
        >
          <List.Dropdown.Item
            icon={Icon.Plus}
            title="New Conversation"
            value="new"
          />
          {chats.length > 0 && (
            <List.Dropdown.Section title="Previous">
              {chats.map((c) => (
                <List.Dropdown.Item
                  key={c.id}
                  title={c.name || "Untitled"}
                  value={String(c.id)}
                />
              ))}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action
            title="Send"
            icon={Icon.Message}
            onAction={() => handleSubmit(query)}
          />
        </ActionPanel>
      }
    >
      {!hasMessages && selectedChat === "new" && chats.length > 0 && (
        <List.Section title="Previous Conversations">
          {chats.map((c) => {
            const preview = c.initial_last_message?.content ?? "";
            const isAgent = c.initial_last_message?.type === "assistant";
            return (
              <List.Item
                key={c.id}
                icon={
                  isAgent
                    ? { source: Icon.SpeechBubbleActive, tintColor: "#f58220" }
                    : Icon.SpeechBubble
                }
                title={c.name || "Untitled"}
                subtitle={preview.slice(0, 80)}
                accessories={[{ text: timeAgo(c.updated_at) }]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Open Conversation"
                      icon={Icon.Eye}
                      onAction={() => setSelectedChat(String(c.id))}
                    />
                    <Action.OpenInBrowser
                      title="Open on Bookface"
                      url={`https://bookface.ycombinator.com/messages/${c.id}`}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
      {!hasMessages &&
        selectedChat === "new" &&
        chats.length === 0 &&
        !isLoadingChats && (
          <List.EmptyView
            icon={Icon.Message}
            title="Ask the YC Agent"
            description="Type a question and press Enter"
          />
        )}
      {pairs.map((pair) => (
        <List.Item
          key={pair.id}
          id={String(pair.id)}
          icon={
            pair.isLoading
              ? Icon.CircleProgress
              : { source: Icon.SpeechBubbleActive, tintColor: "#f58220" }
          }
          title={pair.question}
          subtitle={pair.isLoading ? "Thinking..." : undefined}
          accessories={
            pair.answeredAt ? [{ text: timeAgo(pair.answeredAt) }] : []
          }
          detail={
            <List.Item.Detail
              isLoading={pair.isLoading}
              markdown={
                pair.isLoading
                  ? "Waiting for YC Agent..."
                  : pair.answer
                      .replace(/!\[[^\]]*\]\([^)]+\)/g, "`[IMAGE]`")
                      .replace(/<img[^>]*>/g, "`[IMAGE]`")
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Send"
                icon={Icon.Message}
                onAction={() => handleSubmit(query)}
              />
              {chatId && (
                <Action.OpenInBrowser
                  title="Open on Bookface"
                  url={`https://bookface.ycombinator.com/messages/${chatId}`}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              )}
              <Action.CopyToClipboard
                title="Copy Answer"
                content={pair.answer}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
