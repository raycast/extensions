import {
  Action,
  ActionPanel,
  LaunchProps,
  Toast,
  getPreferenceValues,
  showToast,
  List,
  Icon,
  LocalStorage,
  Form,
  useNavigation,
} from "@raycast/api";
import React from "react";
import searchTool from "./tools/search";
import { listOllamaModels } from "./tools/ollama";
import { showFailureToast } from "@raycast/utils";

type Arguments = {
  query?: string;
};

type Preferences = {
  serperApiKey: string;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
};

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
type ChatSession = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  useWeb: boolean;
  model?: string;
};

function generateId(): string {
  return `chat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function Command(props: LaunchProps<{ arguments?: Arguments }>) {
  const initialQuery = props.arguments?.query ?? "";

  const [chats, setChats] = React.useState<Array<ChatSession>>([]);
  const [selectedChatId, setSelectedChatId] = React.useState<string | null>(null);
  const [input, setInput] = React.useState<string>(initialQuery);
  const [isRunning, setIsRunning] = React.useState<boolean>(false);
  const programmaticSelectRef = React.useRef<boolean>(false);
  const [hydrated, setHydrated] = React.useState<boolean>(false);

  // Load chats from local storage (or initialize one)
  React.useEffect(() => {
    (async () => {
      const nowIso = new Date().toISOString();
      const defaultChat: ChatSession = {
        id: generateId(),
        title: "New Chat",
        messages: [],
        createdAt: nowIso,
        updatedAt: nowIso,
        useWeb: true,
        model: undefined,
      };

      let parsed: Array<ChatSession> | null = null;
      try {
        const stored = await LocalStorage.getItem<string>("chats-v1");
        if (stored) {
          try {
            parsed = JSON.parse(stored) as Array<ChatSession>;
          } catch {
            // try backup
            const backup = await LocalStorage.getItem<string>("chats-v1-bak");
            if (backup) {
              try {
                parsed = JSON.parse(backup) as Array<ChatSession>;
              } catch {
                parsed = null;
              }
            }
          }
        }
      } catch {
        parsed = null;
      }

      const useChats = parsed && Array.isArray(parsed) && parsed.length > 0 ? parsed : [defaultChat];
      setChats(useChats);

      let initialId: string | null = null;
      try {
        const storedSelected = await LocalStorage.getItem<string>("selectedChatId-v1");
        initialId = useChats.find((c) => c.id === storedSelected)?.id ?? useChats[0].id;
      } catch {
        initialId = useChats[0].id;
      }
      programmaticSelectRef.current = true;
      setSelectedChatId(initialId);
      setTimeout(() => {
        programmaticSelectRef.current = false;
      }, 150);
      setHydrated(true);
    })();
  }, []);

  // Persist chats when they change
  React.useEffect(() => {
    if (!hydrated) return;
    (async () => {
      try {
        const payload = JSON.stringify(chats);
        await LocalStorage.setItem("chats-v1", payload);
        await LocalStorage.setItem("chats-v1-bak", payload);
      } catch {
        // ignore persistence errors
      }
    })();
  }, [chats, hydrated]);

  // Persist selected chat id
  React.useEffect(() => {
    if (!hydrated) return;
    (async () => {
      try {
        if (selectedChatId) {
          await LocalStorage.setItem("selectedChatId-v1", selectedChatId);
        }
      } catch {
        // ignore persistence errors
      }
    })();
  }, [selectedChatId, hydrated]);

  const currentChat = React.useMemo(() => {
    if (chats.length === 0) return null;
    const byId = chats.find((c) => c.id === selectedChatId);
    return byId ?? null;
  }, [chats, selectedChatId]);

  async function sendMessage() {
    if (isRunning) return;
    const trimmed = input.trim();
    if (!trimmed) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a message" });
      return;
    }

    setIsRunning(true);
    const thinkingToast = await showToast({ style: Toast.Style.Animated, title: "Thinking…" });

    try {
      // Prepare optional web context
      let webContext = "";
      if (currentChat?.useWeb) {
        try {
          const resultsJson = await searchTool(trimmed);
          const results = JSON.parse(resultsJson) as Array<{
            title?: string;
            link?: string;
            snippet?: string;
          }>;
          const list = results
            .slice(0, 6)
            .map((r, i) => `- (${i + 1}) ${r.title}\n  ${r.link}\n  ${r.snippet}`)
            .join("\n");
          if (list) {
            webContext = `Web results (use if helpful; cite [n] when referencing):\n${list}`;
          }
        } catch {
          // Continue without web context
        }
      }

      const history = currentChat?.messages ?? [];
      const nextMessages: ChatMessage[] = [
        ...history,
        ...(webContext ? [{ role: "system", content: webContext } as ChatMessage] : []),
        { role: "user", content: trimmed } as ChatMessage,
      ];

      const { ollamaBaseUrl = "http://localhost:11434", ollamaModel = "llama3.2:latest" } =
        getPreferenceValues<Preferences>();
      const modelToUse = (currentChat?.model && currentChat.model.trim()) || ollamaModel || "llama3.2:latest";
      const res = await fetch(`${ollamaBaseUrl.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelToUse,
          messages: nextMessages,
          stream: false,
          options: { temperature: 0.2 },
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Ollama error ${res.status}: ${txt}`);
      }
      const json = (await res.json()) as {
        message?: { role?: string; content?: string };
        response?: string;
      };
      const assistantText = (json.message?.content ?? json.response ?? "").trim();
      const updated: ChatMessage[] = [
        ...history,
        ...(webContext ? [{ role: "system", content: webContext } as ChatMessage] : []),
        { role: "user", content: trimmed } as ChatMessage,
        { role: "assistant", content: assistantText } as ChatMessage,
      ];
      setChats((prev) => {
        const now = new Date().toISOString();
        return prev.map((c) =>
          c.id === (currentChat?.id ?? "")
            ? { ...c, messages: updated, updatedAt: now, title: deriveTitle(c.title, trimmed) }
            : c,
        );
      });
      setInput("");
      thinkingToast.style = Toast.Style.Success;
      thinkingToast.title = "Answer ready";
    } catch (error: unknown) {
      try {
        await thinkingToast.hide();
      } catch {}
      showFailureToast(error, { title: "Failed" });
    } finally {
      setIsRunning(false);
    }
  }

  const conversationMarkdown = React.useMemo(() => {
    if (!currentChat || currentChat.messages.length === 0) {
      return "";
    }
    const parts = [...currentChat.messages].reverse().map((m) => {
      const who = m.role === "assistant" ? "Assistant" : m.role === "user" ? "User" : "Context";
      return `## ${who}\n\n${m.content}`;
    });
    return parts.join("\n\n");
  }, [currentChat]);

  const lastAssistantMessage = React.useMemo(() => {
    if (!currentChat) return "";
    for (let i = currentChat.messages.length - 1; i >= 0; i--) {
      if (currentChat.messages[i].role === "assistant") return currentChat.messages[i].content;
    }
    return "";
  }, [currentChat]);

  function newChat() {
    const now = new Date().toISOString();
    const chat: ChatSession = {
      id: generateId(),
      title: "New Chat",
      messages: [],
      createdAt: now,
      updatedAt: now,
      useWeb: true,
      model: undefined,
    };
    setChats((prev) => [chat, ...prev]);
    programmaticSelectRef.current = true;
    setSelectedChatId(chat.id);
    setTimeout(() => {
      programmaticSelectRef.current = false;
    }, 200);
    setInput("");
  }

  function toggleWeb() {
    if (!currentChat) return;
    setChats((prev) =>
      prev.map((c) => (c.id === currentChat.id ? { ...c, useWeb: !c.useWeb, updatedAt: new Date().toISOString() } : c)),
    );
  }

  function deleteChat() {
    if (!currentChat) return;
    setChats((prev) => {
      const filtered = prev.filter((c) => c.id !== currentChat.id);
      if (filtered.length === 0) {
        const now = new Date().toISOString();
        const first: ChatSession = {
          id: generateId(),
          title: "New Chat",
          messages: [],
          createdAt: now,
          updatedAt: now,
          useWeb: true,
        };
        programmaticSelectRef.current = true;
        setSelectedChatId(first.id);
        setTimeout(() => {
          programmaticSelectRef.current = false;
        }, 150);
        return [first];
      }
      programmaticSelectRef.current = true;
      setSelectedChatId(filtered[0].id);
      setTimeout(() => {
        programmaticSelectRef.current = false;
      }, 150);
      return filtered;
    });
  }

  function resetConversation() {
    if (!currentChat) return;
    setChats((prev) =>
      prev.map((c) => (c.id === currentChat.id ? { ...c, messages: [], updatedAt: new Date().toISOString() } : c)),
    );
  }

  function deriveTitle(existing: string, userInput: string): string {
    if (existing && existing !== "New Chat") return existing;
    const base = userInput.replace(/\s+/g, " ").trim();
    return base.length > 60 ? `${base.slice(0, 57)}...` : base || existing || "New Chat";
  }

  function renameChat(newTitle: string) {
    if (!currentChat) return;
    const title = newTitle.trim();
    if (!title) return;
    setChats((prev) =>
      prev.map((c) => (c.id === currentChat.id ? { ...c, title, updatedAt: new Date().toISOString() } : c)),
    );
  }

  function RenameChatForm(props: { initialTitle: string; onSubmit: (title: string) => void }) {
    const [title, setTitle] = React.useState<string>(props.initialTitle ?? "");
    const { pop } = useNavigation();
    return (
      <Form
        navigationTitle="Rename Chat"
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Save"
              onSubmit={() => {
                props.onSubmit(title);
                pop();
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField id="title" title="Title" value={title} onChange={setTitle} autoFocus />
      </Form>
    );
  }

  function ChangeModelForm(props: { initialModel?: string; onSubmit: (model: string | undefined) => void }) {
    const [loading, setLoading] = React.useState<boolean>(true);
    const [models, setModels] = React.useState<string[]>([]);
    const [selection, setSelection] = React.useState<string>(props.initialModel ?? "");
    const [custom, setCustom] = React.useState<string>(props.initialModel ?? "");
    const { pop } = useNavigation();
    React.useEffect(() => {
      (async () => {
        try {
          const { ollamaBaseUrl = "http://localhost:11434" } = getPreferenceValues<Preferences>();
          const list = await listOllamaModels(ollamaBaseUrl);
          setModels(list);
        } catch {
          setModels([]);
        } finally {
          setLoading(false);
        }
      })();
    }, []);
    return (
      <Form
        isLoading={loading}
        navigationTitle="Change Model"
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Save"
              onSubmit={() => {
                const value = selection || custom;
                props.onSubmit(value.trim() ? value.trim() : undefined);
                pop();
              }}
            />
          </ActionPanel>
        }
      >
        <Form.Dropdown
          id="model"
          title="Installed Models"
          value={selection}
          onChange={setSelection}
          placeholder="Select a model"
        >
          <Form.Dropdown.Item value="" title="(Use Default from Preferences)" />
          {models.map((m) => (
            <Form.Dropdown.Item key={m} value={m} title={m} />
          ))}
        </Form.Dropdown>
        <Form.Description text="Or type a custom model name (must be pulled in Ollama)." />
        <Form.TextField
          id="custom"
          title="Custom Model"
          value={custom}
          onChange={setCustom}
          placeholder="e.g., llama3.2:latest"
        />
      </Form>
    );
  }

  return (
    <List
      isLoading={isRunning}
      searchText={input}
      onSearchTextChange={setInput}
      navigationTitle="AI with Internet Search"
      searchBarPlaceholder="Type a message and press Enter or use Send"
      selectedItemId={selectedChatId ?? undefined}
      onSelectionChange={(id) => {
        if (!id) return;
        if (programmaticSelectRef.current) return;
        if (id === selectedChatId) return;
        setSelectedChatId(id);
      }}
      isShowingDetail
      throttle
    >
      {chats.length === 0 ? (
        <List.EmptyView title="Start chatting" description="Type a message above." icon={Icon.Message} />
      ) : (
        <List.Section title="Chats">
          {chats.map((chat) => (
            <List.Item
              key={chat.id}
              id={chat.id}
              title={chat.title || "New Chat"}
              accessories={[{ tag: chat.useWeb ? "Web: On" : "Web: Off" }]}
              detail={<List.Item.Detail markdown={chat.id === currentChat?.id ? conversationMarkdown || "" : ""} />}
              actions={
                <ActionPanel>
                  <Action
                    title={isRunning ? "Sending…" : "Send Message"}
                    icon={Icon.Airplane}
                    onAction={sendMessage}
                    shortcut={{ modifiers: [], key: "return" }}
                  />
                  <Action
                    title={currentChat?.useWeb ? "Disable Web Search" : "Enable Web Search"}
                    icon={Icon.Globe}
                    onAction={toggleWeb}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                  />
                  <Action.Push
                    title="Change Model"
                    icon={Icon.Cog}
                    shortcut={{ modifiers: ["cmd"], key: "m" }}
                    target={
                      <ChangeModelForm
                        initialModel={currentChat?.model}
                        onSubmit={(model) => {
                          if (!currentChat) return;
                          setChats((prev) =>
                            prev.map((c) =>
                              c.id === currentChat.id ? { ...c, model, updatedAt: new Date().toISOString() } : c,
                            ),
                          );
                        }}
                      />
                    }
                  />
                  <Action.Push
                    title="Rename Chat"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    target={<RenameChatForm initialTitle={currentChat?.title ?? ""} onSubmit={renameChat} />}
                  />
                  <Action
                    title="New Chat"
                    icon={Icon.Plus}
                    onAction={newChat}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                  <Action
                    title="Delete Chat"
                    icon={Icon.Trash}
                    onAction={deleteChat}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  />
                  <Action title="Reset Conversation" icon={Icon.RotateAntiClockwise} onAction={resetConversation} />
                  {lastAssistantMessage ? (
                    <Action.CopyToClipboard title="Copy Last Answer" content={lastAssistantMessage} />
                  ) : null}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
