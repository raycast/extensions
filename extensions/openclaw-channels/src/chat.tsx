import {
  Alert,
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  LocalStorage,
  confirmAlert,
  Toast,
  open,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sendMessage } from "./api";
import {
  type GatewayProfile,
  buildWebUiUrl,
  deleteManagedProfile,
  resolveActiveProfileSelection,
  setStoredActiveProfileId,
  testProfileConnection,
  upsertManagedProfile,
} from "./profiles";
import {
  type SessionContext,
  type SessionContextType,
  buildSessionKeyForContext,
  createMainContext,
  describeContext,
  normalizeSessionContext,
} from "./session-context";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  profileId: string;
  context: SessionContext;
};

type ContextFormValues = {
  label?: string;
  type?: string;
  channel?: string;
  accountId?: string;
  peerId?: string;
  groupId?: string;
  roomId?: string;
  threadId?: string;
};

type ProfileFormValues = {
  id: string;
  name: string;
  endpoint: string;
  token: string;
  webUiBaseUrl: string;
};

const STORAGE_KEY = "openclaw-conversations-v3";
const LEGACY_STORAGE_KEYS = ["openclaw-conversations-v2"];
const MAX_CONVERSATIONS = 80;
const FIXED_AGENT_ID = "main";
const FIXED_MAIN_KEY = "main";

function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeMessage(raw: unknown): Message | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as { role?: unknown; content?: unknown; timestamp?: unknown };
  if (row.role !== "user" && row.role !== "assistant") {
    return null;
  }
  const content = typeof row.content === "string" ? row.content : "";
  const timestamp =
    typeof row.timestamp === "number" && Number.isFinite(row.timestamp)
      ? row.timestamp
      : Date.now();
  return { role: row.role, content, timestamp };
}

function normalizeConversation(
  raw: unknown,
  fallbackProfileId: string,
): Conversation | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as {
    id?: unknown;
    title?: unknown;
    messages?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
    profileId?: unknown;
    context?: unknown;
  };

  const id =
    typeof row.id === "string" && row.id.trim() ? row.id : generateId();
  const messages = Array.isArray(row.messages)
    ? row.messages
        .map((item) => normalizeMessage(item))
        .filter((item): item is Message => item !== null)
    : [];
  const createdAt =
    typeof row.createdAt === "number" && Number.isFinite(row.createdAt)
      ? row.createdAt
      : Date.now();
  const updatedAt =
    typeof row.updatedAt === "number" && Number.isFinite(row.updatedAt)
      ? row.updatedAt
      : Date.now();
  const profileId =
    typeof row.profileId === "string" && row.profileId.trim()
      ? row.profileId.trim()
      : fallbackProfileId;

  let context: SessionContext = createMainContext();
  if (row.context && typeof row.context === "object") {
    const c = row.context as SessionContext;
    if (typeof c.type === "string") {
      context = normalizeSessionContext({
        type: c.type as SessionContextType,
        channel: c.channel,
        accountId: c.accountId,
        peerId: c.peerId,
        groupId: c.groupId,
        roomId: c.roomId,
        threadId: c.threadId,
      });
    }
  }

  const titleRaw = typeof row.title === "string" ? row.title.trim() : "";
  const fallbackTitle =
    messages.find((m) => m.role === "user")?.content.slice(0, 50) ||
    describeContext(context);
  const title = titleRaw || fallbackTitle;

  return { id, title, messages, createdAt, updatedAt, profileId, context };
}

async function loadConversations(
  defaultProfileId: string,
): Promise<Conversation[]> {
  const keys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
  for (const key of keys) {
    const raw = await LocalStorage.getItem<string>(key);
    if (!raw) {
      continue;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        continue;
      }
      const rows = parsed
        .map((item) => normalizeConversation(item, defaultProfileId))
        .filter((item): item is Conversation => item !== null)
        .slice(0, MAX_CONVERSATIONS);
      if (rows.length > 0 || key === STORAGE_KEY) {
        if (key !== STORAGE_KEY) {
          await saveConversations(rows);
        }
        return rows;
      }
    } catch {
      // Ignore malformed storage payload.
    }
  }
  return [];
}

async function saveConversations(conversations: Conversation[]): Promise<void> {
  await LocalStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(conversations.slice(0, MAX_CONVERSATIONS)),
  );
}

function contextFromForm(values: ContextFormValues): SessionContext {
  return normalizeSessionContext({
    type: (values.type as SessionContextType) || "main",
    channel: values.channel || undefined,
    accountId: values.accountId || undefined,
    peerId: values.peerId || undefined,
    groupId: values.groupId || undefined,
    roomId: values.roomId || undefined,
    threadId: values.threadId || undefined,
  });
}

function rebindOrphanConversations(
  conversations: Conversation[],
  validProfileIds: Set<string>,
  fallbackProfileId: string,
): Conversation[] {
  let changed = false;
  const next = conversations.map((row) => {
    if (validProfileIds.has(row.profileId)) {
      return row;
    }
    changed = true;
    return {
      ...row,
      profileId: fallbackProfileId,
      updatedAt: Date.now(),
    };
  });
  return changed ? next : conversations;
}

function ProfilePicker(props: {
  profiles: GatewayProfile[];
  activeProfileId: string;
  onSelect: (profileId: string) => Promise<void>;
}) {
  const { pop } = useNavigation();
  return (
    <List searchBarPlaceholder="Select active profile...">
      {props.profiles.map((profile) => (
        <List.Item
          key={profile.id}
          icon={Icon.Network}
          title={profile.name}
          subtitle={profile.endpoint}
          accessories={
            profile.id === props.activeProfileId
              ? [{ text: "Active", icon: Icon.CheckCircle }]
              : []
          }
          actions={
            <ActionPanel>
              <Action
                title="Use This Profile"
                icon={Icon.Check}
                onAction={async () => {
                  await props.onSelect(profile.id);
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ProfileForm(props: {
  mode: "create" | "edit";
  profile?: GatewayProfile;
  onSubmit: (
    profileInput: Partial<GatewayProfile>,
    opts?: { existingId?: string },
  ) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const profile = props.profile;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={props.mode === "create" ? "Create Profile" : "Save Profile"}
            onSubmit={async (values: ProfileFormValues) => {
              const nextId =
                props.mode === "edit" ? profile?.id || "" : values.id.trim();
              if (!nextId) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Profile id is required",
                });
                return;
              }
              try {
                await props.onSubmit(
                  {
                    id: nextId,
                    name: values.name,
                    endpoint: values.endpoint,
                    token: values.token,
                    agentId: FIXED_AGENT_ID,
                    mainKey: FIXED_MAIN_KEY,
                    webUiBaseUrl: values.webUiBaseUrl,
                  },
                  props.mode === "edit" && profile
                    ? { existingId: profile.id }
                    : undefined,
                );
                pop();
              } catch {
                // Keep form open on failure so user can fix values.
              }
            }}
          />
        </ActionPanel>
      }
    >
      {props.mode === "edit" && profile ? (
        <Form.Description title="Profile ID" text={profile.id} />
      ) : (
        <Form.TextField
          id="id"
          title="Profile ID"
          placeholder="solo / vibe-os / prod"
        />
      )}
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={profile?.name}
        placeholder="Human-readable profile name"
      />
      <Form.TextField
        id="endpoint"
        title="Endpoint"
        defaultValue={profile?.endpoint}
        placeholder="http://127.0.0.1:18789"
      />
      <Form.PasswordField
        id="token"
        title="Token"
        defaultValue={profile?.token}
      />
      <Form.Description
        title="Session Routing"
        text={`agentId=${FIXED_AGENT_ID}, mainKey=${FIXED_MAIN_KEY} (fixed)`}
      />
      <Form.TextField
        id="webUiBaseUrl"
        title="Web UI Base URL"
        defaultValue={profile?.webUiBaseUrl}
        placeholder="Optional, defaults to endpoint"
      />
    </Form>
  );
}

function ProfileManager(props: {
  profiles: GatewayProfile[];
  activeProfileId: string;
  onSwitch: (profileId: string) => Promise<void>;
  onUpsert: (
    profileInput: Partial<GatewayProfile>,
    opts?: { existingId?: string },
  ) => Promise<void>;
  onDelete: (profileId: string) => Promise<void>;
  onTest: (profileId: string) => Promise<void>;
}) {
  const { push } = useNavigation();

  return (
    <List searchBarPlaceholder="Manage profiles...">
      <List.Section title="Actions">
        <List.Item
          icon={Icon.Plus}
          title="Create Profile"
          actions={
            <ActionPanel>
              <Action
                title="Create Profile"
                onAction={() =>
                  push(<ProfileForm mode="create" onSubmit={props.onUpsert} />)
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Profiles">
        {props.profiles.map((profile) => (
          <List.Item
            key={profile.id}
            icon={Icon.Network}
            title={profile.name}
            subtitle={profile.endpoint}
            accessories={
              profile.id === props.activeProfileId
                ? [{ text: "Active", icon: Icon.CheckCircle }]
                : []
            }
            actions={
              <ActionPanel>
                <Action
                  title="Use This Profile"
                  onAction={() => props.onSwitch(profile.id)}
                />
                <Action
                  title="Edit Profile"
                  onAction={() =>
                    push(
                      <ProfileForm
                        mode="edit"
                        profile={profile}
                        onSubmit={props.onUpsert}
                      />,
                    )
                  }
                />
                <Action
                  title="Test Connection"
                  onAction={() => props.onTest(profile.id)}
                />
                <Action
                  title="Delete Profile"
                  style={Action.Style.Destructive}
                  onAction={() => props.onDelete(profile.id)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function CloneContextPicker(props: {
  conversation: Conversation;
  profiles: GatewayProfile[];
  onClone: (targetProfileId: string) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const candidates = props.profiles.filter(
    (profile) => profile.id !== props.conversation.profileId,
  );

  return (
    <List searchBarPlaceholder="Clone channel to profile...">
      <List.Section title="Target Profiles">
        {candidates.length === 0 ? (
          <List.Item
            icon={Icon.ExclamationMark}
            title="No other profiles available"
            subtitle="Create another profile first"
          />
        ) : (
          candidates.map((profile) => (
            <List.Item
              key={profile.id}
              icon={Icon.ArrowRight}
              title={profile.name}
              subtitle={profile.endpoint}
              actions={
                <ActionPanel>
                  <Action
                    title="Clone Here"
                    onAction={async () => {
                      await props.onClone(profile.id);
                      pop();
                    }}
                  />
                </ActionPanel>
              }
            />
          ))
        )}
      </List.Section>
    </List>
  );
}

function NewContextForm(props: {
  profile: GatewayProfile;
  onCreate: (context: SessionContext, label: string) => Promise<void>;
}) {
  const [selectedType, setSelectedType] = useState<SessionContextType>("main");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Channel"
            icon={Icon.Plus}
            onSubmit={async (values: ContextFormValues) => {
              await props.onCreate(
                contextFromForm(values),
                (values.label || "").trim(),
              );
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Profile"
        text={`${props.profile.name} (${props.profile.id})`}
      />
      <Form.TextField
        id="label"
        title="Channel Title"
        placeholder="Optional channel title"
      />
      <Form.Dropdown
        id="type"
        title="Channel Type"
        defaultValue="main"
        value={selectedType}
        onChange={(value) => setSelectedType(value as SessionContextType)}
      >
        <Form.Dropdown.Item value="main" title="Main" />
        <Form.Dropdown.Item value="dm" title="DM" />
        <Form.Dropdown.Item value="group" title="Group" />
        <Form.Dropdown.Item value="channel" title="Channel" />
        <Form.Dropdown.Item value="topic" title="Topic" />
      </Form.Dropdown>

      {selectedType !== "main" ? (
        <Form.TextField
          id="channel"
          title="Platform"
          defaultValue="raycast"
          placeholder="telegram / discord / slack / raycast"
        />
      ) : (
        <Form.Description
          title="Route"
          text="Main channel (single long-running context)."
        />
      )}

      {selectedType === "dm" ? (
        <>
          <Form.TextField
            id="peerId"
            title="Peer ID"
            placeholder="DM counterpart id"
          />
          <Form.TextField
            id="accountId"
            title="Account ID (Optional)"
            placeholder="Only needed for multi-account setup"
          />
        </>
      ) : null}

      {selectedType === "group" ? (
        <Form.TextField
          id="groupId"
          title="Group ID"
          placeholder="Group identifier"
        />
      ) : null}

      {selectedType === "channel" ? (
        <Form.TextField
          id="roomId"
          title="Room ID"
          placeholder="Channel/room identifier"
        />
      ) : null}

      {selectedType === "topic" ? (
        <>
          <Form.TextField
            id="threadId"
            title="Thread ID"
            placeholder="Topic/thread identifier"
          />
          <Form.TextField
            id="groupId"
            title="Parent Group ID (Optional)"
            placeholder="Use when topic belongs to a group"
          />
          <Form.TextField
            id="roomId"
            title="Parent Room ID (Optional)"
            placeholder="Use when topic belongs to a channel/room"
          />
        </>
      ) : null}
    </Form>
  );
}

function ConversationView(props: {
  conversation: Conversation;
  profile: GatewayProfile;
  profiles: GatewayProfile[];
  onUpdate: (conversation: Conversation) => void;
  onDelete: (conversationId: string, label?: string) => Promise<void>;
  onCloneToProfile: (
    conversation: Conversation,
    targetProfileId: string,
  ) => Promise<void>;
}) {
  const { pop, push } = useNavigation();
  const [current, setCurrent] = useState(props.conversation);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamTimestamp, setStreamTimestamp] = useState(Date.now());
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    setCurrent(props.conversation);
  }, [props.conversation]);

  const sessionKey = useMemo(
    () => buildSessionKeyForContext(props.profile, current.context),
    [props.profile, current.context],
  );

  const displayMessages = useMemo(
    () => [...current.messages].reverse(),
    [current.messages],
  );

  const mergedMessages = useMemo(() => {
    if (!streamingContent) {
      return displayMessages.map((m) => ({ ...m, streaming: false }));
    }
    return [
      {
        role: "assistant" as const,
        content: streamingContent,
        timestamp: streamTimestamp,
        streaming: true,
      },
      ...displayMessages.map((m) => ({ ...m, streaming: false })),
    ];
  }, [displayMessages, streamingContent, streamTimestamp]);
  const send = useCallback(
    async (rawText?: string) => {
      const text = (rawText ?? input).trim();
      if (!text || isLoading) {
        return;
      }
      if (!rawText) {
        setInput("");
      }

      const previous = current;
      const userMessage: Message = {
        role: "user",
        content: text,
        timestamp: Date.now(),
      };
      const updatedMessages = [...previous.messages, userMessage];
      const optimistic: Conversation = {
        ...previous,
        title: previous.title || text.slice(0, 50),
        messages: updatedMessages,
        updatedAt: Date.now(),
      };
      setCurrent(optimistic);
      props.onUpdate(optimistic);

      setIsLoading(true);
      setStreamingContent("");
      setStreamTimestamp(Date.now());
      lastUpdateRef.current = 0;

      try {
        const apiMessages = updatedMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }));
        let full = "";
        await sendMessage(
          props.profile,
          apiMessages,
          (chunk) => {
            full += chunk;
            const now = Date.now();
            if (now - lastUpdateRef.current > 100) {
              lastUpdateRef.current = now;
              setStreamingContent(full);
            }
          },
          { sessionKey },
        );

        const assistantMessage: Message = {
          role: "assistant",
          content: full,
          timestamp: Date.now(),
        };
        const completed: Conversation = {
          ...optimistic,
          messages: [...updatedMessages, assistantMessage],
          updatedAt: Date.now(),
        };
        setCurrent(completed);
        props.onUpdate(completed);
      } catch (error) {
        setCurrent(previous);
        props.onUpdate(previous);
        await showToast({
          style: Toast.Style.Failure,
          title: "Send failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setStreamingContent("");
        setIsLoading(false);
      }
    },
    [current, input, isLoading, props, sessionKey],
  );

  const resetContext = useCallback(async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setStreamingContent("");

    try {
      await sendMessage(
        props.profile,
        [{ role: "user", content: "/new" }],
        undefined,
        { sessionKey },
      );
      const resetConversation: Conversation = {
        ...current,
        messages: [],
        updatedAt: Date.now(),
      };
      setCurrent(resetConversation);
      props.onUpdate(resetConversation);
      await showToast({
        style: Toast.Style.Success,
        title: "New round started",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Reset failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [current, isLoading, props, sessionKey]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      isShowingDetail
      searchBarPlaceholder="Type message and press Enter"
      searchText={input}
      onSearchTextChange={setInput}
      actions={
        <ActionPanel>
          <Action
            title="Send Message"
            icon={Icon.Message}
            onAction={() => void send()}
          />
          <Action
            title="Send Message (Cmd+Enter)"
            icon={Icon.Message}
            onAction={() => void send()}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
          <Action
            title="Start New Round"
            icon={Icon.ArrowClockwise}
            onAction={() => void resetContext()}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
          <Action
            title="Clone Channel to Profile"
            icon={Icon.Duplicate}
            onAction={() =>
              push(
                <CloneContextPicker
                  conversation={current}
                  profiles={props.profiles}
                  onClone={(targetProfileId) =>
                    props.onCloneToProfile(current, targetProfileId)
                  }
                />,
              )
            }
          />
          <Action
            title="Open Web Chat"
            icon={Icon.Globe}
            onAction={() => void open(buildWebUiUrl(props.profile, sessionKey))}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.CopyToClipboard
            title="Copy Session Key"
            content={sessionKey}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action
            title="Delete Channel"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={async () => {
              await props.onDelete(current.id, current.title || "Untitled");
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <List.Section title={current.title || "Untitled"}>
        {mergedMessages.length === 0 ? (
          <List.Item
            icon={Icon.Message}
            title="Start this channel"
            subtitle="Type above and press Enter"
            detail={<List.Item.Detail markdown="No messages yet." />}
            actions={
              <ActionPanel>
                <Action
                  title="Send Message"
                  onAction={() => void send()}
                  shortcut={{ modifiers: [], key: "return" }}
                />
                <Action
                  title="Send Message (Cmd+Enter)"
                  onAction={() => void send()}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                />
              </ActionPanel>
            }
          />
        ) : (
          mergedMessages.map((message, index) => (
            <List.Item
              key={`${message.timestamp}-${index}-${message.streaming ? "streaming" : "final"}`}
              icon={message.role === "user" ? Icon.Person : Icon.Stars}
              title={message.role === "user" ? "You" : "OpenClaw"}
              subtitle={new Date(message.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              detail={
                <List.Item.Detail
                  markdown={`**${message.role === "user" ? "You" : "OpenClaw"}**\n\n${message.content}`}
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Send Message"
                    onAction={() => void send()}
                    shortcut={{ modifiers: [], key: "return" }}
                  />
                  <Action
                    title="Send Message (Cmd+Enter)"
                    onAction={() => void send()}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Message"
                    content={message.content}
                  />
                </ActionPanel>
              }
            />
          ))
        )}
      </List.Section>
    </List>
  );
}

export default function Command() {
  const { push } = useNavigation();
  const [booting, setBooting] = useState(true);
  const [profiles, setProfiles] = useState<GatewayProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const activeProfile = useMemo(
    () =>
      profiles.find((profile) => profile.id === activeProfileId) || profiles[0],
    [profiles, activeProfileId],
  );

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      setBooting(true);
      try {
        const selection = await resolveActiveProfileSelection();
        if (cancelled) {
          return;
        }
        setProfiles(selection.profiles);
        setActiveProfileId(selection.activeProfileId);
        const loaded = await loadConversations(selection.activeProfileId);
        if (cancelled) {
          return;
        }
        const validProfileIds = new Set(
          selection.profiles.map((profile) => profile.id),
        );
        setConversations(
          rebindOrphanConversations(
            loaded,
            validProfileIds,
            selection.activeProfileId,
          ),
        );
      } catch (e) {
        if (cancelled) {
          return;
        }
        setError(e instanceof Error ? e.message : "Failed to load profiles");
      } finally {
        if (!cancelled) {
          setBooting(false);
        }
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!booting) {
      void saveConversations(conversations);
    }
  }, [booting, conversations]);

  const switchProfile = useCallback(async (profileId: string) => {
    await setStoredActiveProfileId(profileId);
    setActiveProfileId(profileId);
    await showToast({
      style: Toast.Style.Success,
      title: `Active profile: ${profileId}`,
    });
  }, []);

  const upsertProfile = useCallback(
    async (
      profileInput: Partial<GatewayProfile>,
      opts?: { existingId?: string },
    ) => {
      try {
        const next = await upsertManagedProfile(profileInput, opts);
        setProfiles(next);
        const stillExists = next.some(
          (profile) => profile.id === activeProfileId,
        );
        if (!stillExists) {
          const fallback = next[0];
          setActiveProfileId(fallback.id);
          await setStoredActiveProfileId(fallback.id);
        }
        await showToast({
          style: Toast.Style.Success,
          title: opts?.existingId ? "Profile updated" : "Profile created",
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Profile save failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
    [activeProfileId],
  );

  const deleteProfile = useCallback(
    async (profileId: string) => {
      const profile = profiles.find((row) => row.id === profileId);
      if (!profile) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Profile not found",
        });
        return;
      }
      const confirmed = await confirmAlert({
        icon: Icon.Trash,
        title: `Delete profile "${profile.name}"?`,
        message:
          profileId === activeProfileId
            ? "This profile is active. Contexts bound to it will be rebound to another profile."
            : "Contexts bound to this profile will be rebound to the current active profile.",
        primaryAction: {
          title: "Delete Profile",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "Cancel",
          style: Alert.ActionStyle.Cancel,
        },
      });
      if (!confirmed) {
        return;
      }
      try {
        const nextProfiles = await deleteManagedProfile(profileId);
        let nextActiveId = activeProfileId;
        if (!nextProfiles.some((profile) => profile.id === nextActiveId)) {
          nextActiveId = nextProfiles[0].id;
          setActiveProfileId(nextActiveId);
          await setStoredActiveProfileId(nextActiveId);
        }
        setProfiles(nextProfiles);
        setConversations((prev) =>
          prev.map((row) =>
            row.profileId === profileId
              ? { ...row, profileId: nextActiveId, updatedAt: Date.now() }
              : row,
          ),
        );
        await showToast({
          style: Toast.Style.Success,
          title: "Profile deleted",
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Profile delete failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [activeProfileId, profiles],
  );

  const testProfile = useCallback(
    async (profileId: string) => {
      const profile = profiles.find((row) => row.id === profileId);
      if (!profile) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Profile not found",
        });
        return;
      }
      const result = await testProfileConnection(profile);
      await showToast({
        style: result.ok ? Toast.Style.Success : Toast.Style.Failure,
        title: result.ok ? "Connection OK" : "Connection failed",
        message: result.ok
          ? `${profile.name} · ${result.latencyMs}ms`
          : `${profile.name} · ${result.error || `HTTP ${result.statusCode}`}`,
      });
    },
    [profiles],
  );

  const updateConversation = useCallback((updated: Conversation) => {
    setConversations((prev) => {
      const next = prev.filter((row) => row.id !== updated.id);
      next.unshift(updated);
      return next.slice(0, MAX_CONVERSATIONS);
    });
  }, []);

  const deleteConversation = useCallback(
    async (conversationId: string, label?: string) => {
      const confirmed = await confirmAlert({
        icon: Icon.Trash,
        title: `Delete channel "${label || "Untitled"}"?`,
        message: "This local channel history will be removed from Raycast.",
        primaryAction: {
          title: "Delete Channel",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "Cancel",
          style: Alert.ActionStyle.Cancel,
        },
      });
      if (!confirmed) {
        return;
      }
      setConversations((prev) =>
        prev.filter((row) => row.id !== conversationId),
      );
      await showToast({
        style: Toast.Style.Success,
        title: "Channel deleted",
      });
    },
    [],
  );

  const cloneConversationToProfile = useCallback(
    async (conversation: Conversation, targetProfileId: string) => {
      if (conversation.profileId === targetProfileId) {
        return;
      }
      const targetProfile = profiles.find(
        (profile) => profile.id === targetProfileId,
      );
      if (!targetProfile) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Target profile not found",
        });
        return;
      }
      const now = Date.now();
      const cloned: Conversation = {
        id: generateId(),
        title: conversation.title,
        messages: [],
        createdAt: now,
        updatedAt: now,
        profileId: targetProfileId,
        context: normalizeSessionContext(conversation.context),
      };
      updateConversation(cloned);
      await showToast({
        style: Toast.Style.Success,
        title: `Cloned to ${targetProfile.name}`,
      });
    },
    [profiles, updateConversation],
  );

  const openConversation = useCallback(
    (conversation: Conversation) => {
      const profile =
        profiles.find((row) => row.id === conversation.profileId) ||
        activeProfile;
      if (!profile) {
        void showToast({
          style: Toast.Style.Failure,
          title: "No profile for this channel",
        });
        return;
      }
      push(
        <ConversationView
          conversation={conversation}
          profile={profile}
          profiles={profiles}
          onUpdate={updateConversation}
          onDelete={deleteConversation}
          onCloneToProfile={cloneConversationToProfile}
        />,
      );
    },
    [
      activeProfile,
      cloneConversationToProfile,
      deleteConversation,
      profiles,
      push,
      updateConversation,
    ],
  );

  const createContext = useCallback(
    async (context: SessionContext, label: string) => {
      if (!activeProfile) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No active profile",
        });
        return;
      }
      const normalized = normalizeSessionContext(context);
      const now = Date.now();
      const conversation: Conversation = {
        id: generateId(),
        title: label || describeContext(normalized),
        messages: [],
        createdAt: now,
        updatedAt: now,
        profileId: activeProfile.id,
        context: normalized,
      };
      updateConversation(conversation);
      openConversation(conversation);
    },
    [activeProfile, openConversation, updateConversation],
  );

  const contextsByProfile = useMemo(() => {
    const map = new Map<string, Conversation[]>();
    for (const row of conversations) {
      const list = map.get(row.profileId) || [];
      list.push(row);
      map.set(row.profileId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    return map;
  }, [conversations]);

  const activeProfileAccessory = activeProfile
    ? [{ text: `Active: ${activeProfile.name}` }]
    : [{ text: "Active: none" }];

  return (
    <List isLoading={booting} searchBarPlaceholder="OpenClaw channels">
      {error ? (
        <List.Section title="Error">
          <List.Item title={error} icon={Icon.ExclamationMark} />
        </List.Section>
      ) : null}

      <List.Section title="Actions">
        <List.Item
          icon={Icon.ArrowRight}
          title="Switch Profile"
          subtitle={
            activeProfile
              ? `${activeProfile.name} (${activeProfile.id})`
              : "No active profile"
          }
          accessories={activeProfileAccessory}
          actions={
            <ActionPanel>
              <Action
                title="Switch Profile"
                icon={Icon.ArrowRight}
                onAction={() =>
                  push(
                    <ProfilePicker
                      profiles={profiles}
                      activeProfileId={activeProfileId}
                      onSelect={switchProfile}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Gear}
          title="Manage Profiles"
          subtitle={`${profiles.length} configured`}
          accessories={activeProfileAccessory}
          actions={
            <ActionPanel>
              <Action
                title="Manage Profiles"
                icon={Icon.Gear}
                onAction={() =>
                  push(
                    <ProfileManager
                      profiles={profiles}
                      activeProfileId={activeProfileId}
                      onSwitch={switchProfile}
                      onUpsert={upsertProfile}
                      onDelete={deleteProfile}
                      onTest={testProfile}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Plus}
          title="New Channel"
          subtitle={activeProfile ? activeProfile.name : "No active profile"}
          accessories={activeProfileAccessory}
          actions={
            <ActionPanel>
              <Action
                title="Create Channel"
                icon={Icon.Plus}
                onAction={() => {
                  if (!activeProfile) {
                    void showToast({
                      style: Toast.Style.Failure,
                      title: "No active profile",
                    });
                    return;
                  }
                  push(
                    <NewContextForm
                      profile={activeProfile}
                      onCreate={createContext}
                    />,
                  );
                }}
              />
            </ActionPanel>
          }
        />
        {activeProfile ? (
          <List.Item
            icon={Icon.Globe}
            title="Open Web UI"
            subtitle={buildWebUiUrl(activeProfile)}
            accessories={activeProfileAccessory}
            actions={
              <ActionPanel>
                <Action
                  title="Open Web UI"
                  icon={Icon.Globe}
                  onAction={() => void open(buildWebUiUrl(activeProfile))}
                />
              </ActionPanel>
            }
          />
        ) : null}
      </List.Section>

      {profiles.map((profile) => {
        const rows = contextsByProfile.get(profile.id) || [];
        if (rows.length === 0 && profile.id !== activeProfileId) {
          return null;
        }
        return (
          <List.Section
            key={profile.id}
            title={`Channels (${profile.name}${profile.id === activeProfileId ? " · active" : ""})`}
          >
            {rows.length === 0 ? (
              <List.Item
                icon={Icon.Message}
                title="No channels yet"
                subtitle="Create one to start chatting"
              />
            ) : (
              rows.map((conversation) => (
                <List.Item
                  key={conversation.id}
                  icon={Icon.Message}
                  title={conversation.title || "Untitled"}
                  subtitle={describeContext(conversation.context)}
                  accessories={[
                    { text: `${conversation.messages.length} msgs` },
                    {
                      text: new Date(
                        conversation.updatedAt,
                      ).toLocaleDateString(),
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Open Channel"
                        icon={Icon.ArrowRight}
                        onAction={() => openConversation(conversation)}
                      />
                      <Action
                        title="Clone Channel to Profile"
                        icon={Icon.Duplicate}
                        onAction={() =>
                          push(
                            <CloneContextPicker
                              conversation={conversation}
                              profiles={profiles}
                              onClone={(targetProfileId) =>
                                cloneConversationToProfile(
                                  conversation,
                                  targetProfileId,
                                )
                              }
                            />,
                          )
                        }
                      />
                      <Action
                        title="Delete Channel"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() =>
                          void deleteConversation(
                            conversation.id,
                            conversation.title || "Untitled",
                          )
                        }
                      />
                      <Action.CopyToClipboard
                        title="Copy Session Key"
                        content={buildSessionKeyForContext(
                          profile,
                          conversation.context,
                        )}
                      />
                    </ActionPanel>
                  }
                />
              ))
            )}
          </List.Section>
        );
      })}
    </List>
  );
}
