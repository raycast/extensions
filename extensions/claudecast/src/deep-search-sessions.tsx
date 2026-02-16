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
import { useState, useEffect, useRef, useCallback } from "react";
import { existsSync } from "fs";
import {
  searchSessionContent,
  getSessionDetail,
  deleteSession,
  SessionMetadata,
  SessionDetail,
} from "./lib/session-parser";
import { launchClaudeCode } from "./lib/terminal";
import { ensureClaudeInstalled } from "./lib/claude-cli";

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;

function getEmptyDescription(searchText: string, isSearching: boolean): string {
  if (searchText.length === 0)
    return "Type at least 3 characters to search session content";
  if (searchText.length < MIN_QUERY_LENGTH) {
    const remaining = MIN_QUERY_LENGTH - searchText.length;
    return `Type ${remaining} more character${remaining === 1 ? "" : "s"} to start searching`;
  }
  if (isSearching) return "Searching session content...";
  return `No sessions matched "${searchText}"`;
}

export default function DeepSearchSessions() {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SessionMetadata[]>([]);
  const [searchText, setSearchText] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup debounce timer and abort in-flight search on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const performSearch = useCallback(async (query: string) => {
    // Cancel any in-flight search
    abortRef.current?.abort();

    if (query.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsSearching(true);
    setResults([]);

    const seenIds = new Set<string>();

    try {
      await searchSessionContent(
        query,
        (session) => {
          if (controller.signal.aborted) return;
          // Deduplicate by session ID
          if (seenIds.has(session.id)) return;
          seenIds.add(session.id);
          setResults((prev) => [...prev, session]);
        },
        controller.signal,
      );
    } catch (error: unknown) {
      if (controller.signal.aborted) return; // Expected cancellation
      console.error("Deep search failed:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Search failed",
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    }

    if (!controller.signal.aborted) {
      setIsSearching(false);
    }
  }, []);

  const onSearchTextChange = useCallback(
    (text: string) => {
      setSearchText(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => performSearch(text), DEBOUNCE_MS);
    },
    [performSearch],
  );

  const emptyDescription = getEmptyDescription(searchText, isSearching);

  return (
    <List
      isLoading={isSearching}
      searchBarPlaceholder="Search all session content..."
      filtering={false}
      onSearchTextChange={onSearchTextChange}
      throttle
    >
      {results.map((session) => (
        <SearchResultItem
          key={session.id}
          session={session}
          onDelete={() =>
            setResults((prev) => prev.filter((s) => s.id !== session.id))
          }
        />
      ))}

      {results.length === 0 && (
        <List.EmptyView
          title={isSearching ? "Searching..." : "Deep Search Sessions"}
          description={emptyDescription}
          icon={isSearching ? Icon.MagnifyingGlass : Icon.Message}
        />
      )}
    </List>
  );
}

function SearchResultItem({
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
    if (!(await ensureClaudeInstalled())) return;
    if (!existsSync(session.projectPath)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Project path no longer exists",
        message: session.projectPath,
      });
      return;
    }
    await launchClaudeCode({
      projectPath: session.projectPath,
      sessionId: session.id,
    });
    await popToRoot();
  }

  async function handleFork() {
    if (!(await ensureClaudeInstalled())) return;
    if (!existsSync(session.projectPath)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Project path no longer exists",
        message: session.projectPath,
      });
      return;
    }
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
      try {
        await deleteSession(session.id);
        onDelete();
        await showToast({
          style: Toast.Style.Success,
          title: "Session deleted",
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete session",
          message: error instanceof Error ? error.message : String(error),
        });
      }
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
    (async () => {
      try {
        const detail = await getSessionDetail(sessionId);
        setSession(detail);
      } catch (err) {
        console.error("Failed to load session detail:", err);
      } finally {
        setIsLoading(false);
      }
    })();
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
              if (!(await ensureClaudeInstalled())) return;
              if (!existsSync(projectPath)) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Project path no longer exists",
                  message: projectPath,
                });
                return;
              }
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
              if (!(await ensureClaudeInstalled())) return;
              if (!existsSync(projectPath)) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Project path no longer exists",
                  message: projectPath,
                });
                return;
              }
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
