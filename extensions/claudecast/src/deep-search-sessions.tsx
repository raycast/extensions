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
import {
  searchSessionContent,
  getSessionDetailAtMatch,
  deleteSession,
  safeTruncate,
  SessionMetadata,
  SessionDetail,
} from "./lib/session-parser";
import { isWslSession, launchStoredSession } from "./lib/session-launch";
import { shortcut } from "./lib/shortcuts";
import type { SearchIndexPhase } from "./lib/session-search-index";
import { localImageMarkdownUrl } from "./lib/session-search-index";

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;

function getEmptyDescription(
  searchText: string,
  isSearching: boolean,
  searchPhase: SearchIndexPhase | null,
): string {
  if (searchText.length === 0)
    return "Type at Least 3 Characters to Search Session Content";
  if (searchText.length < MIN_QUERY_LENGTH) {
    const remaining = MIN_QUERY_LENGTH - searchText.length;
    return `Type ${remaining} More Character${remaining === 1 ? "" : "s"} to Start Searching`;
  }
  if (isSearching) return `${searchPhase ?? "Updating Index"}...`;
  return `No Sessions Matched "${searchText}"`;
}

export default function DeepSearchSessions() {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SessionMetadata[]>([]);
  const [searchText, setSearchText] = useState("");
  const [searchPhase, setSearchPhase] = useState<SearchIndexPhase | null>(null);
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
      setSearchPhase(null);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsSearching(true);
    setSearchPhase("Updating Index");
    setResults([]);

    const seenIdentities = new Set<string>();

    try {
      await searchSessionContent(
        query,
        (session) => {
          if (controller.signal.aborted) return;
          const identity = session.identity ?? session.filePath;
          if (seenIdentities.has(identity)) return;
          seenIdentities.add(identity);
          setResults((prev) => [...prev, session]);
        },
        controller.signal,
        (status) => {
          if (!controller.signal.aborted) setSearchPhase(status.phase);
        },
      );
    } catch (error: unknown) {
      if (controller.signal.aborted) return; // Expected cancellation
      console.error("Deep search failed:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Search Failed",
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    }

    if (!controller.signal.aborted) {
      setIsSearching(false);
      setSearchPhase(null);
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

  const emptyDescription = getEmptyDescription(
    searchText,
    isSearching,
    searchPhase,
  );

  return (
    <List
      isLoading={isSearching}
      searchBarPlaceholder="Search All Session Content, Use dir:Project to Filter"
      filtering={false}
      onSearchTextChange={onSearchTextChange}
      throttle
    >
      {results.map((session) => (
        <SearchResultItem
          key={session.identity ?? session.filePath}
          session={session}
          onDelete={() =>
            setResults((prev) =>
              prev.filter(
                (item) =>
                  (item.identity ?? item.filePath) !==
                  (session.identity ?? session.filePath),
              ),
            )
          }
        />
      ))}

      {results.length === 0 && (
        <List.EmptyView
          title={
            isSearching
              ? (searchPhase ?? "Updating Index")
              : "Deep Search Sessions"
          }
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
  const title =
    session.title || session.firstMessage || session.summary || session.id;
  const truncatedTitle = safeTruncate(title, 60, "...");

  const accessories: List.Item.Accessory[] = [];

  if (session.archived) {
    accessories.push({
      tag: { value: "Archived", color: Color.SecondaryText },
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
        title: "Deleting session...",
      });
      try {
        const deleted = await deleteSession(session.id, session.filePath);
        if (!deleted)
          throw new Error("This Session Could Not Be Moved to Trash");
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
      subtitle={session.projectName}
      icon={Icon.Message}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Session">
            <Action.Push
              title={session.match ? "View Matched Message" : "View Details"}
              icon={Icon.Eye}
              shortcut={shortcut.primary("d")}
              target={<SessionDetailView result={session} />}
            />
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
    const controller = new AbortController();
    (async () => {
      try {
        const detail = await getSessionDetailAtMatch(result, {
          before: 3,
          after: 3,
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setSession(detail);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Failed to load session detail:", err);
          setLoadError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    })();
    return () => controller.abort();
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
  const referencedFiles = (session.mentionedFiles ?? []).slice(0, 10);
  const sourceNames = (session.sources ?? [])
    .map((source) => formatBackendName(source.backend))
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(", ");

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Session ID" text={session.id} />
          <Detail.Metadata.Label title="Project" text={session.projectName} />
          <Detail.Metadata.Label title="Path" text={session.projectPath} />
          {sourceNames && (
            <Detail.Metadata.Label title="Sources" text={sourceNames} />
          )}
          {session.gitBranch && (
            <Detail.Metadata.Label
              title="Git Branch"
              text={
                session.gitBranch === "HEAD"
                  ? "Detached HEAD"
                  : session.gitBranch
              }
            />
          )}
          {session.archived && (
            <Detail.Metadata.TagList title="State">
              <Detail.Metadata.TagList.Item
                text="Archived"
                color={Color.SecondaryText}
              />
            </Detail.Metadata.TagList>
          )}
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
          {referencedFiles.length > 0 && (
            <ActionPanel.Section title="Referenced Files">
              {referencedFiles.map((filePath) => (
                <Action.Open
                  key={filePath}
                  title={`Open ${filePath.split(/[\\/]/).pop() || "File"}`}
                  target={filePath}
                  icon={Icon.Document}
                />
              ))}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}

function formatSessionMarkdown(session: SessionDetail): string {
  const title = safeTruncate(
    session.title || session.firstMessage || session.summary || "Session",
    90,
    "…",
  );
  let md = `# ${title}\n\n`;

  if (session.summary) {
    md += `> ${session.summary}\n\n`;
  }

  const rendered = session.messages;
  const matched = rendered.find((message) => message.matched);
  if (matched?.messageIndex !== undefined) {
    md += `*Showing ${rendered.length} messages around match ${matched.messageIndex + 1} of ${session.totalMessageCount}.*\n\n`;
  } else if (session.totalMessageCount > rendered.length) {
    md += `*Showing ${rendered.length} of ${session.totalMessageCount} messages.*\n\n`;
  }

  md += `---\n\n`;
  md += `## Conversation\n\n`;

  for (const message of rendered) {
    const role =
      message.type === "user"
        ? "**You**"
        : message.type === "system"
          ? "**Summary**"
          : "**Claude**";
    if (message.matched) md += `### Matched Message\n\n`;
    const content = message.content;

    md += `${role}:\n${content}\n\n`;
    for (const imagePath of message.imagePaths ?? []) {
      md += `![](${localImageMarkdownUrl(imagePath)}?raycast-width=350)\n\n`;
    }
  }

  return md;
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

function formatConversationText(session: SessionDetail): string {
  return session.messages
    .map((m) => {
      const role = m.type === "user" ? "User" : "Claude";
      return `${role}: ${m.content}`;
    })
    .join("\n\n");
}
