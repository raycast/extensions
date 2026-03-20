import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  useNavigation,
  showToast,
  Toast,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { listMessages, getMessage, deleteMessage, markMessageAsRead, htmlToMarkdown, Message } from "./utils/m365";
import ComposeView from "./compose";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function buildDetailMarkdown(msg: Message, fullBody?: string): string {
  const from = msg.from?.emailAddress;
  const lines = [
    `**From:** ${from?.name ?? ""} <${from?.address ?? ""}>`,
    `**Subject:** ${msg.subject ?? "(no subject)"}`,
    `**Date:** ${new Date(msg.receivedDateTime).toLocaleString()}`,
    "",
    "---",
    "",
    fullBody ?? msg.bodyPreview,
  ];
  return lines.join("\n");
}

export default function Inbox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullBodies, setFullBodies] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const { push } = useNavigation();

  const fetchMessages = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const msgs = await listMessages("inbox");
      setMessages(msgs);
    } catch (err) {
      const msg = String(err);
      setError(msg);
      showToast({ title: "Failed to load inbox", message: msg, style: Toast.Style.Failure });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Auto-mark as read after 2s of selection
  useEffect(() => {
    if (!selectedId) return;
    const msg = messages.find((m) => m.id === selectedId);
    if (!msg || msg.isRead) return;
    const timer = setTimeout(() => {
      markMessageAsRead(selectedId)
        .then(() => setMessages((prev) => prev.map((m) => (m.id === selectedId ? { ...m, isRead: true } : m))))
        .catch(() => {
          // silently fail
        });
    }, 2000);
    return () => clearTimeout(timer);
  }, [selectedId, messages]);

  // Lazy-load full body when a message is selected
  useEffect(() => {
    if (!selectedId || fullBodies[selectedId]) return;
    getMessage(selectedId)
      .then((msg) => {
        const body = msg.body?.contentType === "html" ? htmlToMarkdown(msg.body.content) : (msg.body?.content ?? "");
        setFullBodies((prev) => ({ ...prev, [selectedId]: body }));
      })
      .catch(() => {
        // Silently fall back to bodyPreview
      });
  }, [selectedId, fullBodies]);

  async function handleDelete(id: string) {
    const confirmed = await confirmAlert({
      title: "Delete Email",
      message: "Are you sure you want to delete this email?",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await deleteMessage(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      showToast({ title: "Email deleted", style: Toast.Style.Success });
    } catch (err) {
      showToast({ title: "Failed to delete", message: String(err), style: Toast.Style.Failure });
    }
  }

  const filtered = showUnreadOnly ? messages.filter((m) => !m.isRead) : messages;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      onSelectionChange={setSelectedId}
      searchBarPlaceholder="Filter emails..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={(v) => setShowUnreadOnly(v === "unread")}>
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Unread" value="unread" />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not load inbox"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={fetchMessages} />
            </ActionPanel>
          }
        />
      ) : (
        filtered.map((msg) => {
          const from = msg.from?.emailAddress;
          return (
            <List.Item
              key={msg.id}
              id={msg.id}
              title={msg.subject ?? "(no subject)"}
              subtitle={from?.name ?? from?.address ?? ""}
              icon={
                msg.isRead
                  ? { source: Icon.Envelope, tintColor: Color.SecondaryText }
                  : { source: Icon.Envelope, tintColor: Color.Blue }
              }
              accessories={[{ text: formatDate(msg.receivedDateTime) }]}
              detail={<List.Item.Detail markdown={buildDetailMarkdown(msg, fullBodies[msg.id])} />}
              actions={
                <ActionPanel>
                  <Action
                    title="Reply"
                    icon={Icon.ArrowRight}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => push(<ComposeView replyTo={msg} />)}
                  />
                  <Action
                    title="Compose New"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={() => push(<ComposeView />)}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                    onAction={fetchMessages}
                  />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => handleDelete(msg.id)}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
