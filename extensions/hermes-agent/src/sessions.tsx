import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getConfig } from "./api";
import { ConversationView } from "./conversation";
import {
  deleteSession,
  forkSession,
  listSessions,
  renameSession,
  SessionSummary,
} from "./hermes-client";

const SOURCE_ICON: Record<string, Icon> = {
  cli: Icon.Terminal,
  desktop: Icon.Desktop,
  api_server: Icon.Globe,
  telegram: Icon.Message,
  discord: Icon.Message,
  slack: Icon.Message,
  cron: Icon.Clock,
};

function relativeTime(epochSeconds: number | null): string {
  if (!epochSeconds) {
    return "";
  }
  const deltaSeconds = Math.max(0, Date.now() / 1000 - epochSeconds);
  if (deltaSeconds < 90) {
    return "just now";
  }
  if (deltaSeconds < 3600) {
    return `${Math.round(deltaSeconds / 60)}m ago`;
  }
  if (deltaSeconds < 86400) {
    return `${Math.round(deltaSeconds / 3600)}h ago`;
  }
  return `${Math.round(deltaSeconds / 86400)}d ago`;
}

export default function Command() {
  const config = useMemo(() => getConfig(), []);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setSessions(await listSessions(config, { limit: 100 }));
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load sessions",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleDelete(session: SessionSummary) {
    const confirmed = await confirmAlert({
      title: "Delete Session?",
      message: `"${session.title || session.id}" and its transcript will be removed from the Hermes session store.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }
    try {
      await deleteSession(config, session.id);
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      showToast({ style: Toast.Style.Success, title: "Session deleted" });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Delete failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleFork(session: SessionSummary) {
    try {
      const forkId = await forkSession(config, session.id);
      showToast({ style: Toast.Style.Success, title: "Session forked" });
      push(
        <ConversationView
          sessionId={forkId}
          sessionTitle={`Fork of ${session.title || session.id}`}
        />,
      );
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Fork failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search sessions by title or preview…"
    >
      {sessions.map((session) => {
        const title = session.title || session.preview || session.id;
        return (
          <List.Item
            key={session.id}
            icon={SOURCE_ICON[session.source || ""] || Icon.Message}
            title={title}
            subtitle={session.preview && session.title ? session.preview : ""}
            accessories={[
              session.source
                ? { tag: { value: session.source, color: Color.Blue } }
                : {},
              { text: `${session.message_count} msgs` },
              { text: relativeTime(session.last_active) },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Continue Conversation"
                  icon={Icon.ArrowRight}
                  onAction={() =>
                    push(
                      <ConversationView
                        sessionId={session.id}
                        sessionTitle={session.title || undefined}
                      />,
                    )
                  }
                />
                <Action
                  title="Fork and Continue"
                  icon={Icon.Duplicate}
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
                  onAction={() => handleFork(session)}
                />
                <Action.Push
                  title="Rename Session"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  target={
                    <RenameView
                      session={session}
                      onRenamed={(newTitle) =>
                        setSessions((prev) =>
                          prev.map((s) =>
                            s.id === session.id ? { ...s, title: newTitle } : s,
                          ),
                        )
                      }
                    />
                  }
                />
                <Action.CopyToClipboard
                  title="Copy Session ID"
                  content={session.id}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Resume Command"
                  content={`hermes --resume ${session.id}`}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  onAction={refresh}
                />
                <Action
                  title="Delete Session"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => handleDelete(session)}
                />
              </ActionPanel>
            }
          />
        );
      })}
      <List.EmptyView
        icon={Icon.Message}
        title={isLoading ? "Loading sessions…" : "No sessions yet"}
        description={
          isLoading
            ? ""
            : "Sessions from every Hermes surface (CLI, desktop, messaging, Raycast) show up here."
        }
      />
    </List>
  );
}

function RenameView({
  session,
  onRenamed,
}: {
  session: SessionSummary;
  onRenamed: (title: string) => void;
}) {
  const config = useMemo(() => getConfig(), []);
  const { pop } = useNavigation();
  const [title, setTitle] = useState(session.title || "");

  async function submit() {
    try {
      await renameSession(config, session.id, title);
      onRenamed(title);
      showToast({ style: Toast.Style.Success, title: "Session renamed" });
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Rename failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        value={title}
        onChange={setTitle}
        autoFocus
      />
    </Form>
  );
}
