import {
  Action,
  ActionPanel,
  List,
  Icon,
  Toast,
  showToast,
  LocalStorage,
} from "@raycast/api";
import { useCallback, useEffect, useState, useRef } from "react";
import {
  useAuth,
  AuthGate,
  fetchModels,
  DEFAULT_MODEL_KEY,
  CopilotModel,
  streamChat,
  Message,
} from "./shared";

type Chat = {
  id: string;
  title: string;
  updatedAt: string;
  messages: Message[];
};

const MODEL_SESSION_KEY = "selected_model";
const CHATS_SESSION_KEY = "saved_chats";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>("new");
  const [isLoading, setIsLoading] = useState(false);
  const { ghoToken, deviceFlow, logout } = useAuth();

  const [models, setModels] = useState<CopilotModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o");
  const isCmdNPressed = useRef(false);

  const handleNewChat = () => {
    isCmdNPressed.current = true;
    setSearchText("");
    setActiveChatId("new");
    setTimeout(() => {
      isCmdNPressed.current = false;
    }, 100);
  };

  // Load saved model preference and chat history on startup
  useEffect(() => {
    const loadState = async () => {
      const sessionModel =
        await LocalStorage.getItem<string>(MODEL_SESSION_KEY);
      const defaultModel =
        await LocalStorage.getItem<string>(DEFAULT_MODEL_KEY);
      setSelectedModel(sessionModel || defaultModel || "gpt-4o");

      const savedChatsJson =
        await LocalStorage.getItem<string>(CHATS_SESSION_KEY);
      if (savedChatsJson) {
        try {
          const parsed = JSON.parse(savedChatsJson) as Chat[];
          setChats(
            parsed.sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() -
                new Date(a.updatedAt).getTime(),
            ),
          );
        } catch (e) {
          console.error("Failed to parse chats", e);
        }
      }
    };
    loadState();
  }, []);

  // Fetch available models
  useEffect(() => {
    if (!ghoToken) return;
    fetchModels(ghoToken)
      .then(setModels)
      .catch((err) => console.error("Failed to load models", err));
  }, [ghoToken]);

  const onModelChange = (newValue: string) => {
    setSelectedModel(newValue);
    LocalStorage.setItem(MODEL_SESSION_KEY, newValue);
  };

  const activeChat = chats.find((c) => c.id === activeChatId);
  const messages =
    activeChatId === "new" || !activeChat ? [] : activeChat.messages;

  const saveChats = async (newChats: Chat[]) => {
    setChats(newChats);
    await LocalStorage.setItem(CHATS_SESSION_KEY, JSON.stringify(newChats));
  };

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !ghoToken) return;

      const newMessages: Message[] = [
        ...messages,
        { role: "user", content: text },
      ];

      // Determine chat to update or create new
      let chatId = activeChatId;
      let currentChats = [...chats];

      if (!chatId || chatId === "new") {
        chatId = Date.now().toString();
        const newChat: Chat = {
          id: chatId,
          title: text.substring(0, 40) + (text.length > 40 ? "..." : ""),
          updatedAt: new Date().toISOString(),
          messages: newMessages,
        };
        currentChats = [newChat, ...currentChats];
        setActiveChatId(chatId);
      } else {
        const idx = currentChats.findIndex((c) => c.id === chatId);
        if (idx !== -1) {
          currentChats[idx] = {
            ...currentChats[idx],
            updatedAt: new Date().toISOString(),
            messages: newMessages,
          };
          // Move to top
          const [chat] = currentChats.splice(idx, 1);
          currentChats = [chat, ...currentChats];
        }
      }

      saveChats(currentChats);
      setSearchText("");
      setIsLoading(true);

      let assistantContent = "";
      const updateAssistantMessage = (content: string) => {
        setChats((prev) => {
          return prev.map((chat) => {
            if (chat.id === chatId) {
              const msgs = [...chat.messages];
              if (msgs[msgs.length - 1].role === "user") {
                msgs.push({ role: "assistant", content: "" });
              }
              msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content };
              return {
                ...chat,
                messages: msgs,
                updatedAt: new Date().toISOString(),
              };
            }
            return chat;
          });
        });
      };

      try {
        await streamChat(
          ghoToken,
          newMessages,
          (content) => {
            assistantContent = content;
            updateAssistantMessage(assistantContent);
          },
          () => {
            setIsLoading(false);
          },
          (error) => {
            showToast({
              style: Toast.Style.Failure,
              title: "Failed to send message",
              message: error instanceof Error ? error.message : String(error),
            });
            setIsLoading(false);
          },
          undefined,
          selectedModel,
        );
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to send message",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
        // Also persist chats when streaming is done
        setChats((prev) => {
          LocalStorage.setItem(CHATS_SESSION_KEY, JSON.stringify(prev));
          return prev;
        });
      }
    },
    [messages, ghoToken, selectedModel, chats, activeChatId],
  );

  const deleteChat = async (id: string) => {
    const newChats = chats.filter((c) => c.id !== id);
    if (activeChatId === id) setActiveChatId("new");
    await saveChats(newChats);
  };

  const clearAllChats = async () => {
    await saveChats([]);
    setActiveChatId("new");
  };

  return (
    <AuthGate ghoToken={ghoToken} deviceFlow={deviceFlow}>
      <List
        isLoading={isLoading}
        searchBarPlaceholder="Ask Copilot..."
        searchText={searchText}
        onSearchTextChange={setSearchText}
        selectedItemId={activeChatId}
        onSelectionChange={(id) => {
          if (isCmdNPressed.current) return;
          if (id && id !== activeChatId) setActiveChatId(id);
        }}
        isShowingDetail={true}
        filtering={false}
        searchBarAccessory={
          models.length > 0 ? (
            <List.Dropdown
              tooltip="Select Model"
              value={selectedModel}
              onChange={onModelChange}
            >
              {models.map((model) => (
                <List.Dropdown.Item
                  key={model.id}
                  title={model.name}
                  value={model.id}
                />
              ))}
            </List.Dropdown>
          ) : null
        }
      >
        {activeChatId === "new" && (
          <List.Section title="Current">
            <List.Item
              id="new"
              title="New Chat"
              icon={Icon.PlusCircle}
              detail={
                <List.Item.Detail
                  markdown={
                    "## Start chatting with Copilot\n\nType your message below and press `Enter`."
                  }
                />
              }
              actions={
                <ActionPanel>
                  {searchText.trim().length > 0 && (
                    <Action
                      title="Send Message"
                      icon={Icon.Message}
                      onAction={() => sendMessage(searchText)}
                    />
                  )}
                  <Action
                    title="Start New Chat"
                    icon={Icon.PlusCircle}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={handleNewChat}
                  />
                  <Action
                    title="Logout"
                    icon={Icon.Logout}
                    onAction={logout}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                  />
                </ActionPanel>
              }
            />
          </List.Section>
        )}

        {chats.length > 0 && (
          <List.Section title="History">
            {chats.map((chat) => {
              const isActive = activeChatId === chat.id;
              const chatMarkdown = [...chat.messages]
                .reverse()
                .map((msg) =>
                  msg.role === "user"
                    ? `---\n 👨‍💻:\n\n${msg.content}\n`
                    : `⚡:\n\n${msg.content}\n`,
                )
                .join("\n");
              return (
                <List.Item
                  key={chat.id}
                  id={chat.id}
                  title={chat.title}
                  icon={isActive ? Icon.SpeechBubbleActive : Icon.Message}
                  detail={<List.Item.Detail markdown={chatMarkdown} />}
                  actions={
                    <ActionPanel>
                      {searchText.trim().length > 0 && (
                        <Action
                          title="Send Message"
                          icon={Icon.Message}
                          onAction={() => sendMessage(searchText)}
                        />
                      )}
                      <Action
                        title="Start New Chat"
                        icon={Icon.PlusCircle}
                        shortcut={{ modifiers: ["cmd"], key: "n" }}
                        onAction={handleNewChat}
                      />
                      <Action
                        title="Delete Chat"
                        icon={Icon.Trash}
                        shortcut={{ modifiers: ["ctrl"], key: "x" }}
                        onAction={() => deleteChat(chat.id)}
                        style={Action.Style.Destructive}
                      />
                      <Action
                        title="Clear All History"
                        icon={Icon.DeleteDocument}
                        shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                        onAction={clearAllChats}
                        style={Action.Style.Destructive}
                      />
                      <Action.CopyToClipboard
                        title="Copy Chat"
                        content={chat.messages
                          .map((m) => `**${m.role}:** ${m.content}`)
                          .join("\n")}
                      />
                      <Action
                        title="Logout"
                        icon={Icon.Logout}
                        onAction={logout}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        )}
      </List>
    </AuthGate>
  );
}
