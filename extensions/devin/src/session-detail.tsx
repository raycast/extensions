import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  showToast,
  Toast,
  useNavigation,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useEffect, useRef } from "react";
import { useCachedPromise } from "@raycast/utils";
import {
  getSession,
  getSessionUrl,
  getSessionsPageUrl,
  getPrUrl,
  normalizeStatus,
  terminateSession,
  SessionMessage,
  SessionStatus,
} from "./api";
import { SendMessageForm, EditTagsForm } from "./session-forms";

const STATUS_CONFIG: Record<SessionStatus, { icon: Icon; tint: Color; label: string }> = {
  working: { icon: Icon.CircleProgress, tint: Color.Blue, label: "Working" },
  blocked: { icon: Icon.ExclamationMark, tint: Color.Orange, label: "Needs Input" },
  finished: { icon: Icon.CheckCircle, tint: Color.Green, label: "Finished" },
  expired: { icon: Icon.Clock, tint: Color.SecondaryText, label: "Expired" },
  suspended: { icon: Icon.Pause, tint: Color.Yellow, label: "Suspended" },
  unknown: { icon: Icon.QuestionMarkCircle, tint: Color.SecondaryText, label: "Unknown" },
};

const POLL_INTERVAL_MS = 5000;

function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatMessageOrigin(msg: SessionMessage): string {
  if (msg.username) return msg.username;
  const source = msg.origin ?? msg.type;
  if (source.includes("user")) return "User";
  if (source.includes("devin")) return "Devin";
  return source;
}

function buildMarkdown(status: SessionStatus, messages: SessionMessage[]): string {
  const lines: string[] = [];

  // Show a prominent banner when the session needs input
  if (status === "blocked") {
    lines.push("> **Devin is waiting for your input.** Press `Enter` to send a message.");
    lines.push("");
  }

  if (messages.length > 0) {
    // Show most recent messages first so the latest is immediately visible
    const recentMessages = messages.slice(-30).reverse();
    if (messages.length > 30) {
      lines.push(`*Showing latest 30 of ${messages.length} messages*`);
      lines.push("");
    }

    for (const msg of recentMessages) {
      const sender = formatMessageOrigin(msg);
      const time = formatRelativeTime(msg.timestamp);
      const isCurrentUser = msg.origin === "user" && !msg.username;
      const prefix = isCurrentUser ? "**You**" : `**${sender}**`;
      lines.push(`${prefix} — *${time}*`);
      lines.push("");
      lines.push(msg.message);
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  } else {
    lines.push("*No messages yet*");
  }

  return lines.join("\n");
}

export default function SessionDetailView({ sessionId }: { sessionId: string }) {
  const { push } = useNavigation();
  const {
    data: session,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (id: string) => {
      return await getSession(id);
    },
    [sessionId],
  );

  // Auto-refresh: poll for new messages while session is active
  const revalidateRef = useRef(revalidate);
  revalidateRef.current = revalidate;

  const status = session ? normalizeStatus(session.status, session.status_enum) : "unknown";
  const isLive = status === "working" || status === "blocked" || status === "suspended";

  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(() => revalidateRef.current(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isLive]);

  if (!session) {
    return <Detail isLoading={isLoading} markdown="Loading session..." />;
  }

  const title = session.title || `Session ${session.session_id.slice(0, 8)}`;
  const sessionUrl = getSessionUrl(session.session_id);
  const isActive = status === "working" || status === "blocked";
  const canMessage = status !== "expired" && status !== "unknown";

  async function handleArchive() {
    if (
      await confirmAlert({
        title: "Archive Session",
        message: "This will terminate the session. Are you sure?",
        primaryAction: { title: "Archive", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await terminateSession(session!.session_id);
        showToast({ style: Toast.Style.Success, title: "Session archived" });
        revalidate();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to archive",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  const markdown = buildMarkdown(status, session.messages);
  const config = STATUS_CONFIG[status];

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={title}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text={config.label}
            icon={{ source: config.icon, tintColor: config.tint }}
          />
          <Detail.Metadata.Label title="Created" text={formatRelativeTime(session.created_at)} />
          <Detail.Metadata.Label title="Updated" text={formatRelativeTime(session.updated_at)} />
          {session.tags && session.tags.length > 0 && (
            <Detail.Metadata.TagList title="Tags">
              {session.tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} color={Color.Purple} />
              ))}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Messages"
            text={canMessage ? `${session.messages.length}  —  ↩ to reply` : `${session.messages.length}`}
            icon={Icon.Message}
          />
          {session.pull_request && (
            <Detail.Metadata.Link
              title="Pull Request  ⌘⇧P"
              text="Open PR"
              target={getPrUrl(session.pull_request.url)}
            />
          )}
          {session.structured_output && Object.keys(session.structured_output).length > 0 && (
            <Detail.Metadata.Label title="Structured Output  ⌘⇧J" text="Available" icon={Icon.Document} />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {canMessage && (
            <ActionPanel.Section title="Communicate">
              <Action
                title="Send Message"
                icon={Icon.Message}
                onAction={() =>
                  push(<SendMessageForm sessionId={session.session_id} sessionTitle={title} onSent={revalidate} />)
                }
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section title="Session">
            <Action.OpenInBrowser title="Open in Browser" url={sessionUrl} icon={Icon.Globe} />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => {
                revalidate();
                showToast({ style: Toast.Style.Success, title: "Refreshed" });
              }}
            />
            <Action.CopyToClipboard
              title="Copy Session URL"
              content={sessionUrl}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Session Id"
              content={session.session_id}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
          {session.pull_request && (
            <ActionPanel.Section title="Pull Request">
              <Action.OpenInBrowser
                title="Open Pull Request"
                url={getPrUrl(session.pull_request.url)}
                icon={Icon.Link}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              />
            </ActionPanel.Section>
          )}
          {session.structured_output && Object.keys(session.structured_output).length > 0 && (
            <ActionPanel.Section title="Output">
              <Action.CopyToClipboard
                title="Copy Structured Output"
                content={JSON.stringify(session.structured_output, null, 2)}
                icon={Icon.Document}
                shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section title="Manage">
            <Action
              title="Edit Tags"
              icon={Icon.Tag}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={() =>
                push(
                  <EditTagsForm
                    sessionId={session.session_id}
                    sessionTitle={title}
                    currentTags={session.tags ?? []}
                    onSaved={revalidate}
                  />,
                )
              }
            />
            {isActive && (
              <Action
                title="Archive Session"
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={handleArchive}
              />
            )}
            <Action.OpenInBrowser
              title="Open All Sessions"
              url={getSessionsPageUrl()}
              icon={Icon.AppWindowList}
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
