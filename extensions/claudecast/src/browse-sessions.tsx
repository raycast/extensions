import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
  Alert,
  confirmAlert,
  popToRoot,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  listAllSessions,
  getSessionDetail,
  deleteSession,
  SessionMetadata,
  SessionDetail,
} from "./lib/session-parser";
import { launchClaudeCode } from "./lib/terminal";

export default function BrowseSessions() {
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [filterProject, setFilterProject] = useState<string | null>(null);

  async function loadSessions() {
    setIsLoading(true);
    const allSessions = await listAllSessions();
    setSessions(allSessions);
    setIsLoading(false);
  }

  useEffect(() => {
    loadSessions();
  }, []);

  // Get unique projects for filter dropdown
  const projects = [...new Set(sessions.map((s) => s.projectName))].sort();

  const filteredSessions = filterProject
    ? sessions.filter((s) => s.projectName === filterProject)
    : sessions;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search sessions..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Project"
          onChange={(value) => setFilterProject(value === "all" ? null : value)}
        >
          <List.Dropdown.Item title="All Projects" value="all" />
          <List.Dropdown.Section title="Projects">
            {projects.map((project) => (
              <List.Dropdown.Item
                key={project}
                title={project}
                value={project}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredSessions.map((session) => (
        <SessionItem
          key={session.id}
          session={session}
          onDelete={async () => {
            try {
              await deleteSession(session.id);
              loadSessions();
            } catch (error) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Failed to delete session",
                message: error instanceof Error ? error.message : String(error),
              });
            }
          }}
        />
      ))}

      {!isLoading && filteredSessions.length === 0 && (
        <List.EmptyView
          title="No Sessions Found"
          description={
            filterProject
              ? `No sessions found for ${filterProject}`
              : "Run Claude Code to create your first session"
          }
          icon={Icon.Message}
        />
      )}
    </List>
  );
}

function SessionItem({
  session,
  onDelete,
}: {
  session: SessionMetadata;
  onDelete: () => void;
}) {
  const title = session.firstMessage || session.summary || session.id;
  const truncatedTitle = title.length > 60 ? title.slice(0, 60) + "..." : title;

  const accessories: List.Item.Accessory[] = [];

  accessories.push({
    tag: {
      value: session.projectName,
      color: Color.Blue,
    },
  });

  if (session.turnCount > 0) {
    accessories.push({
      text: `${session.turnCount} turns`,
      icon: Icon.Message,
    });
  }

  if (session.cost > 0) {
    accessories.push({
      text: `$${session.cost.toFixed(4)}`,
      icon: Icon.Coins,
    });
  }

  accessories.push({
    date: session.lastModified,
  });

  async function handleResume() {
    await launchClaudeCode({
      projectPath: session.projectPath,
      sessionId: session.id,
    });
    await popToRoot();
  }

  async function handleFork() {
    await launchClaudeCode({
      projectPath: session.projectPath,
      sessionId: session.id,
      forkSession: true,
    });
    await popToRoot();
  }

  async function handleDelete() {
    const confirmed = await confirmAlert({
      title: "Delete Session",
      message: `Are you sure you want to delete this session?\n\n"${truncatedTitle}"`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await showToast({
        style: Toast.Style.Animated,
        title: "Deleting session...",
      });
      onDelete();
      await showToast({ style: Toast.Style.Success, title: "Session deleted" });
    }
  }

  return (
    <List.Item
      title={truncatedTitle}
      subtitle={session.summary || undefined}
      icon={Icon.Message}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Session">
            <Action
              title="Resume Session"
              icon={Icon.ArrowRight}
              onAction={handleResume}
            />
            <Action
              title="Fork Session"
              icon={Icon.ArrowNe}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={handleFork}
            />
            <Action.Push
              title="View Details"
              icon={Icon.Eye}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              target={
                <SessionDetailView
                  sessionId={session.id}
                  projectPath={session.projectPath}
                />
              }
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Session Id"
              content={session.id}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Project Path"
              content={session.projectPath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Danger">
            <Action
              title="Delete Session"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={handleDelete}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function SessionDetailView({
  sessionId,
  projectPath,
}: {
  sessionId: string;
  projectPath: string;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<SessionDetail | null>(null);

  useEffect(() => {
    async function loadDetail() {
      const detail = await getSessionDetail(sessionId);
      setSession(detail);
      setIsLoading(false);
    }
    loadDetail();
  }, [sessionId]);

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (!session) {
    return (
      <Detail markdown="# Session Not Found\n\nThis session could not be loaded." />
    );
  }

  const markdown = formatSessionMarkdown(session);

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Session ID" text={session.id} />
          <Detail.Metadata.Label title="Project" text={session.projectName} />
          <Detail.Metadata.Label title="Path" text={session.projectPath} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Turns"
            text={`${session.turnCount} messages`}
          />
          {session.cost > 0 && (
            <Detail.Metadata.Label
              title="Cost"
              text={`$${session.cost.toFixed(4)}`}
            />
          )}
          {session.model && (
            <Detail.Metadata.Label title="Model" text={session.model} />
          )}
          <Detail.Metadata.Label
            title="Last Modified"
            text={session.lastModified.toLocaleString()}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Resume Session"
            icon={Icon.ArrowRight}
            onAction={async () => {
              await launchClaudeCode({
                projectPath,
                sessionId,
              });
              await popToRoot();
            }}
          />
          <Action
            title="Fork Session"
            icon={Icon.ArrowNe}
            onAction={async () => {
              await launchClaudeCode({
                projectPath,
                sessionId,
                forkSession: true,
              });
              await popToRoot();
            }}
          />
          <Action.CopyToClipboard
            title="Copy Conversation"
            content={formatConversationText(session)}
          />
        </ActionPanel>
      }
    />
  );
}

function formatSessionMarkdown(session: SessionDetail): string {
  let md = `# ${session.firstMessage || session.summary || "Session"}\n\n`;

  if (session.summary) {
    md += `> ${session.summary}\n\n`;
  }

  md += `---\n\n`;
  md += `## Conversation\n\n`;

  for (const message of session.messages.slice(0, 20)) {
    const role = message.type === "user" ? "**You**" : "**Claude**";
    const content =
      message.content.length > 500
        ? message.content.slice(0, 500) + "..."
        : message.content;

    md += `${role}:\n${content}\n\n`;
  }

  if (session.messages.length > 20) {
    md += `\n*...and ${session.messages.length - 20} more messages*\n`;
  }

  return md;
}

function formatConversationText(session: SessionDetail): string {
  return session.messages
    .map((m) => {
      const role = m.type === "user" ? "User" : "Claude";
      return `${role}: ${m.content}`;
    })
    .join("\n\n");
}
