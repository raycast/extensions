// @ts-nocheck
import { ActionPanel, Action, List, getPreferenceValues, Icon, Form, useNavigation, confirmAlert, Alert } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { useState, useMemo } from "react";
import OpenAI from "openai";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  archived?: boolean;
}

function formatMessages(msgs: Message[]) {
  if (msgs.length === 0) return "No messages yet. Start typing your message in the search bar below and press Enter!";
  return msgs.map((msg) => `**${msg.role === "user" ? "🧑 You" : "🤖 AI"}**:\n\n${msg.content}`).join("\n\n---\n\n");
}

function RenameForm({ session, onRename }: { session: ChatSession; onRename: (id: string, newTitle: string) => void }) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Title"
            onSubmit={(values) => {
              if (values.title.trim()) {
                onRename(session.id, values.title.trim());
              }
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Chat Title" defaultValue={session.title} />
    </Form>
  );
}

function ArchiveList({ sessions, setSessions }: { sessions: ChatSession[]; setSessions: (s: ChatSession[]) => void }) {
  const { pop } = useNavigation();
  const archivedSessions = sessions.filter((s) => s.archived).sort((a, b) => b.updatedAt - a.updatedAt);

  async function clearArchive() {
    if (
      await confirmAlert({
        icon: Icon.Trash,
        title: "Clear Archive",
        message: "Are you sure you want to permanently delete all archived chats? This cannot be undone.",
        primaryAction: {
          title: "Delete All",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      setSessions(sessions.filter((s) => !s.archived));
      pop();
    }
  }

  return (
    <List isShowingDetail={true} searchBarPlaceholder="Search archive...">
      {archivedSessions.map((session) => (
        <List.Item
          key={session.id}
          id={session.id}
          title={session.title}
          subtitle={`${session.messages.length} msgs`}
          icon={Icon.Box}
          detail={<List.Item.Detail markdown={formatMessages(session.messages)} />}
          actions={
            <ActionPanel>
              <Action
                title="Restore Chat"
                icon={Icon.Reply}
                onAction={() => setSessions(sessions.map((s) => (s.id === session.id ? { ...s, archived: false } : s)))}
              />
              <Action
                title="Delete Permanently"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => setSessions(sessions.filter((s) => s.id !== session.id))}
              />
              <Action.CopyToClipboard
                title="Copy Chat History"
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                content={formatMessages(session.messages)}
              />
              {archivedSessions.length > 0 && (
                <Action
                  title="Clear Archive"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                  onAction={clearArchive}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView title="Archive is Empty" icon={Icon.Box} />
    </List>
  );
}

export default function Command() {
  const preferences = getPreferenceValues();

  const openai = useMemo(
    () =>
      new OpenAI({
        apiKey: preferences.apiKey,
        baseURL: "https://integrate.api.nvidia.com/v1",
      }),
    [preferences.apiKey],
  );

  const [cachedApiKey, setCachedApiKey] = useCachedState<string>("cached-apiKey", "");
  const [cachedModels, setCachedModels] = useCachedState<{ id: string; name: string }[]>("cached-models", []);
  const [recentModelIds, setRecentModelIds] = useCachedState<string[]>("recent-models", []);

  const shouldFetchModels = preferences.apiKey !== cachedApiKey || cachedModels.length === 0;

  const { isLoading: isLoadingModels, revalidate: reloadModels } = usePromise(
    async (apiKeyToFetch) => {
      const response = await openai.models.list();
      const uniqueModelsRaw = Array.from(new Map(response.data.map((m) => [m.id, m])).values());
      const newModels = uniqueModelsRaw
        .map((m) => ({ id: m.id, name: m.id }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setCachedModels(newModels);
      setCachedApiKey(apiKeyToFetch);
      return newModels;
    },
    [preferences.apiKey],
    {
      execute: shouldFetchModels,
    },
  );

  const [modelId, setModelId] = useCachedState<string>("selected-model", "");

  const [sessions, setSessions] = useCachedState<ChatSession[]>("chat-sessions", []);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  const effectiveModelId = modelId || (cachedModels.length > 0 ? cachedModels[0].id : "");

  function handleModelChange(newId: string) {
    setModelId(newId);
    setRecentModelIds((prev) => {
      const topRecent = [newId, ...(prev || []).filter((id) => id !== newId)].slice(0, 5);
      return topRecent;
    });
  }

  async function sendMessage() {
    if (!searchText.trim() || !effectiveModelId) return;

    setRecentModelIds((prev) => {
      const topRecent = [effectiveModelId, ...(prev || []).filter((id) => id !== effectiveModelId)].slice(0, 5);
      return topRecent;
    });

    const userInput = searchText.trim();
    setSearchText("");
    setIsLoading(true);

    const userMsg: Message = { role: "user", content: userInput };

    let currentSessionId = selectedSessionId;
    let isNewSession = false;

    if (currentSessionId === "new" || !currentSessionId) {
      currentSessionId = Date.now().toString();
      isNewSession = true;
    }

    const currentSession = sessions.find((s) => s.id === currentSessionId);
    const updatedMessages = currentSession ? [...currentSession.messages, userMsg] : [userMsg];

    const newSession: ChatSession = {
      id: currentSessionId,
      title: isNewSession
        ? userInput.length > 30
          ? userInput.substring(0, 30) + "..."
          : userInput
        : currentSession?.title || "Chat",
      messages: updatedMessages,
      updatedAt: Date.now(),
      archived: false,
    };

    let newSessionsList = [];
    if (isNewSession) {
      newSessionsList = [newSession, ...sessions];
      setSelectedSessionId(currentSessionId);
    } else {
      newSessionsList = sessions.map((s) => (s.id === currentSessionId ? newSession : s));
    }
    setSessions(newSessionsList);

    try {
      const response = await openai.chat.completions.create({
        model: effectiveModelId,
        messages: updatedMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });
      const assistantMessage = response.choices[0]?.message?.content || "";

      const finalSession = {
        ...newSession,
        messages: [...updatedMessages, { role: "assistant" as const, content: assistantMessage }],
      };

      setSessions((prev) => prev.map((s) => (s.id === currentSessionId ? finalSession : s)));
    } catch (error) {
      console.error(error);
      const errorSession = {
        ...newSession,
        messages: [
          ...updatedMessages,
          {
            role: "assistant",
            content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
      };
      setSessions((prev) => prev.map((s) => (s.id === currentSessionId ? errorSession : s)));
    } finally {
      setIsLoading(false);
    }
  }

  function archiveSession(id: string) {
    setSessions(sessions.map((s) => (s.id === id ? { ...s, archived: true } : s)));
    if (selectedSessionId === id) {
      setSelectedSessionId(null);
    }
  }

  function renameSession(id: string, newTitle: string) {
    setSessions(sessions.map((s) => (s.id === id ? { ...s, title: newTitle } : s)));
  }

  const newChatMarkdown =
    "## 🆕 Start a New Chat\n\nType your prompt in the search bar below and press **Enter** to start a new AI conversation.";

  const recentModels = (recentModelIds || []).map((id) => cachedModels.find((m) => m.id === id)).filter(Boolean);
  const restModels = cachedModels.filter((m) => !(recentModelIds || []).includes(m.id));

  const activeSessions = sessions.filter((s) => !s.archived).sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <List
      isLoading={isLoading || isLoadingModels}
      isShowingDetail={true}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      onSelectionChange={setSelectedSessionId}
      searchBarPlaceholder="Message Nvidia AI..."
      filtering={false}
      searchBarAccessory={
        cachedModels.length > 0 ? (
          <List.Dropdown tooltip="Select Model" value={effectiveModelId} onChange={handleModelChange}>
            {recentModels.length > 0 && (
              <List.Dropdown.Section title="Recent Models">
                {recentModels.map((model) => (
                  <List.Dropdown.Item key={`recent-${model.id}`} title={model.name} value={model.id} />
                ))}
              </List.Dropdown.Section>
            )}
            <List.Dropdown.Section title="All Models">
              {restModels.map((model) => (
                <List.Dropdown.Item key={`all-${model.id}`} title={model.name} value={model.id} />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : null
      }
    >
      <List.Item
        id="new"
        title="✨ New Chat"
        icon={Icon.PlusCircle}
        detail={<List.Item.Detail markdown={newChatMarkdown} />}
        actions={
          <ActionPanel>
            <Action title="Send Message" onAction={sendMessage} icon={Icon.Message} />
            <Action.Push
              title="View Archive"
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              icon={Icon.Box}
              target={<ArchiveList sessions={sessions} setSessions={setSessions} />}
            />
            <Action
              title="Refresh Models"
              onAction={() => reloadModels()}
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            />
          </ActionPanel>
        }
      />

      {activeSessions.map((session) => (
        <List.Item
          key={session.id}
          id={session.id}
          title={session.title}
          subtitle={`${session.messages.length} msgs`}
          icon={Icon.Message}
          detail={<List.Item.Detail markdown={formatMessages(session.messages)} />}
          actions={
            <ActionPanel>
              <Action title="Send Message" onAction={sendMessage} icon={Icon.Message} />
              <Action
                title="Archive Chat"
                shortcut={{ modifiers: ["cmd"], key: "delete" }}
                style={Action.Style.Destructive}
                onAction={() => archiveSession(session.id)}
                icon={Icon.Box}
              />
              <Action.Push
                title="Rename Chat"
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                icon={Icon.Pencil}
                target={<RenameForm session={session} onRename={renameSession} />}
              />
              <Action.Push
                title="View Archive"
                shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                icon={Icon.Box}
                target={<ArchiveList sessions={sessions} setSessions={setSessions} />}
              />
              <Action.CopyToClipboard
                title="Copy Chat History"
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                content={formatMessages(session.messages)}
              />
              <Action
                title="Refresh Models"
                onAction={() => reloadModels()}
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
