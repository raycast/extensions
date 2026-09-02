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
import { useState, useEffect, useRef } from "react";
import {
  listAllSessions,
  getSessionDetailForSession,
  deleteSession,
  safeTruncate,
  type SessionMetadata,
  type SessionDetail,
} from "./lib/session-parser";
import { shortcut } from "./lib/shortcuts";
import { isWslSession, launchStoredSession } from "./lib/session-launch";

export default function BrowseSessions() {
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [filterProject, setFilterProject] = useState<string | null>(null);
  const loadSequence = useRef(0);

  async function loadSessions() {
    const sequence = ++loadSequence.current;
    setIsLoading(true);
    try {
      const allSessions = await listAllSessions({ limit: 200 });
      if (sequence !== loadSequence.current) return;
      const seenIdentities = new Map<string, SessionMetadata>();
      for (const session of allSessions) {
        const identity = session.identity ?? session.filePath;
        const existing = seenIdentities.get(identity);
        if (!existing || session.lastModified > existing.lastModified) {
          seenIdentities.set(identity, session);
        }
      }
      setSessions(Array.from(seenIdentities.values()));
    } catch (error) {
      if (sequence === loadSequence.current) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Session Inbox Could Not Be Loaded",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      if (sequence === loadSequence.current) setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadSessions();
    return () => {
      loadSequence.current++;
    };
  }, []);

  // Get unique projects for filter dropdown
  const projects = [...new Set(sessions.map((s) => s.projectName))].sort();

  const filteredSessions = filterProject
    ? sessions.filter((s) => s.projectName === filterProject)
    : sessions;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Sessions, Sources, Branches, and Paths"
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
          key={session.identity ?? session.filePath}
          session={session}
          onDelete={async () => {
            try {
              const deleted = await deleteSession(session.id, session.filePath);
              if (!deleted)
                throw new Error("This Session Could Not Be Moved to Trash");
              await loadSessions();
            } catch (error) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Session Could Not Be Deleted",
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
              ? `No Sessions Found for ${filterProject}`
              : "Run Claude Code to Create Your First Session"
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
  const title =
    session.title || session.firstMessage || session.summary || session.id;
  const truncatedTitle = safeTruncate(title, 60, "...");

  const accessories: List.Item.Accessory[] = [];

  accessories.push({
    tag: {
      value: session.projectName,
      color: Color.Blue,
    },
  });

  const sourceNames = (session.sources ?? [])
    .map((source) => formatBackendName(source.backend))
    .filter((value, index, values) => values.indexOf(value) === index);
  if (sourceNames.length > 0) {
    accessories.push({ text: sourceNames.join(" + "), icon: Icon.Layers });
  }
  if (session.archived) {
    accessories.push({
      tag: { value: "Archived", color: Color.SecondaryText },
    });
  }

  if (session.turnCount > 0) {
    accessories.push({
      text: `${session.turnCount} Turns`,
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
    try {
      await launchStoredSession(session);
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Session Could Not Be Resumed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleFork() {
    try {
      await launchStoredSession(session, { fork: true });
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Session Could Not Be Forked",
        message: error instanceof Error ? error.message : String(error),
      });
    }
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
        title: "Deleting Session...",
      });
      onDelete();
      await showToast({ style: Toast.Style.Success, title: "Session Deleted" });
    }
  }

  return (
    <List.Item
      title={truncatedTitle}
      subtitle={
        session.summary && session.summary !== title
          ? session.summary
          : session.gitBranch || undefined
      }
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
              shortcut={shortcut.primary("f")}
              onAction={handleFork}
            />
            <Action.Push
              title="View Details"
              icon={Icon.Eye}
              shortcut={shortcut.primary("d")}
              target={<SessionDetailView result={session} />}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Session Id"
              content={session.id}
              shortcut={shortcut.copy}
            />
            <Action.CopyToClipboard
              title="Copy Project Path"
              content={session.projectPath}
              shortcut={shortcut.copyPath}
            />
          </ActionPanel.Section>

          {!isWslSession(session) ? (
            <ActionPanel.Section title="Danger">
              <Action
                title="Delete Session"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={shortcut.remove}
                onAction={handleDelete}
              />
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
    />
  );
}

function SessionDetailView({ result }: { result: SessionMetadata }) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const detail = await getSessionDetailForSession(result);
        if (!cancelled) setSession(detail);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [result]);

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (loadError) {
    return (
      <Detail markdown={`# Session Could Not Be Loaded\n\n${loadError}`} />
    );
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
          {session.sources && session.sources.length > 0 ? (
            <Detail.Metadata.Label
              title="Sources"
              text={session.sources
                .map((source) => formatBackendName(source.backend))
                .filter(
                  (value, index, values) => values.indexOf(value) === index,
                )
                .join(", ")}
            />
          ) : null}
          {session.gitBranch ? (
            <Detail.Metadata.Label
              title="Git Branch"
              text={session.gitBranch}
            />
          ) : null}
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
              try {
                await launchStoredSession(session);
                await popToRoot();
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Session Could Not Be Resumed",
                  message:
                    error instanceof Error ? error.message : String(error),
                });
              }
            }}
          />
          <Action
            title="Fork Session"
            icon={Icon.ArrowNe}
            onAction={async () => {
              try {
                await launchStoredSession(session, { fork: true });
                await popToRoot();
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Session Could Not Be Forked",
                  message:
                    error instanceof Error ? error.message : String(error),
                });
              }
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

  // Render budget is 20 messages; the banner reflects what the user actually sees.
  const rendered = session.messages.slice(-20);
  if (session.totalMessageCount > rendered.length) {
    md += `*Showing last ${rendered.length} of ${session.totalMessageCount} messages.*\n\n`;
  }

  md += `---\n\n`;
  md += `## Conversation\n\n`;

  for (const message of rendered) {
    const role = message.type === "user" ? "**You**" : "**Claude**";
    const content = safeTruncate(message.content, 500, "...");

    md += `${role}:\n${content}\n\n`;
  }

  return md;
}

function formatConversationText(session: SessionDetail): string {
  // session.messages is already capped (default last 200) by the parser.
  // The clipboard reflects what the user is actually viewing.
  const body = session.messages
    .map((m) => {
      const role = m.type === "user" ? "User" : "Claude";
      return `${role}: ${m.content}`;
    })
    .join("\n\n");

  if (session.totalMessageCount > session.messages.length) {
    return (
      body +
      `\n\n[truncated: copied last ${session.messages.length} of ${session.totalMessageCount} messages]`
    );
  }
  return body;
}

function formatBackendName(
  backend: NonNullable<SessionMetadata["sources"]>[number]["backend"],
): string {
  switch (backend) {
    case "claude-cli":
      return "Claude CLI";
    case "claude-desktop":
      return "Claude Desktop";
    case "vscode":
      return "VS Code";
    case "conductor":
      return "Conductor";
    case "wsl":
      return "WSL";
  }
}
