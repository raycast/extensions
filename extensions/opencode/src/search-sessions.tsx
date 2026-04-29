import { useState } from "react";
import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import {
  DbSession,
  OpenSession,
  useAllSessions,
  useContentSearch,
  useOpenSessions,
  useSessionMessages,
  useSessionTodos,
} from "./lib/hooks";
import { resumeSession } from "./lib/terminal";

export function formatTime(timestamp: number): string {
  // Guard: if timestamp is in seconds (< 1e12), convert to milliseconds
  const ts = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  const now = Date.now();
  const diffMs = now - ts;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function livenessTag(liveness: OpenSession["liveness"] | undefined): List.Item.Accessory | null {
  if (liveness === "active") return { tag: { value: "Active", color: Color.Green } };
  if (liveness === "open") return { tag: { value: "Open", color: Color.Blue } };
  return null;
}

function SessionActivity({ session }: { session: DbSession }) {
  const { data: todos = [] } = useSessionTodos(session.id);
  const { data: messages = [] } = useSessionMessages(session.id);

  const todoSection =
    todos.length > 0
      ? `## Tasks\n\n${todos
          .map((t) => {
            const icon =
              t.status === "completed"
                ? "✅"
                : t.status === "in_progress"
                  ? "🔄"
                  : t.status === "cancelled"
                    ? "❌"
                    : "⬜";
            return `${icon} ${t.content}`;
          })
          .join("\n")}`
      : "";

  const activitySection =
    messages.length > 0
      ? `## Recent Activity\n\n${messages
          .map((m) => {
            const roleIcon = m.info.role === "user" ? "👤" : "🤖";
            const textPart = m.parts.find((p) => p.type === "text");
            const text = textPart?.text ?? "";
            const truncated = text.length > 120 ? text.slice(0, 117) + "..." : text;
            return `${roleIcon} ${truncated}`;
          })
          .join("\n\n")}`
      : "";

  const markdown = [`# ${session.title}`, todoSection, activitySection].filter(Boolean).join("\n\n");

  return (
    <Detail
      markdown={markdown}
      navigationTitle={session.title}
      actions={
        <ActionPanel>
          <Action
            title="Resume in Terminal"
            icon={Icon.Terminal}
            onAction={() => resumeSession(session.directory, session.id)}
          />
          <Action.CopyToClipboard
            title="Copy Session ID"
            content={session.id}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

export function SessionListItem({
  session,
  liveness,
}: {
  session: DbSession;
  liveness: OpenSession["liveness"] | undefined;
}) {
  const accessories: List.Item.Accessory[] = [];
  const tag = livenessTag(liveness);
  if (tag) accessories.push(tag);
  accessories.push({ text: formatTime(session.timeUpdated) });

  return (
    <List.Item
      key={session.id}
      title={session.title}
      subtitle={session.directory}
      icon={Icon.Message}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title="Resume in Terminal"
            icon={Icon.Terminal}
            onAction={() => resumeSession(session.directory, session.id, liveness !== undefined)}
          />
          <Action.Push title="View Activity" icon={Icon.Eye} target={<SessionActivity session={session} />} />
          <Action.CopyToClipboard
            title="Copy Session ID"
            content={session.id}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

export function getLiveness(openSessions: OpenSession[], sessionId: string): OpenSession["liveness"] | undefined {
  const found = openSessions.find((o) => o.id === sessionId);
  return found?.liveness;
}

export default function SearchSessions() {
  const [mode, setMode] = useState<string>("content");
  const [searchText, setSearchText] = useState("");

  const { data: recentSessions = [], isLoading: recentLoading } = useAllSessions();
  const { data: contentResults = [], isLoading: contentLoading } = useContentSearch(
    mode === "content" ? searchText : "",
  );
  const { data: rawOpen } = useOpenSessions();
  const openSessions: OpenSession[] = Array.isArray(rawOpen) ? rawOpen : [];

  const isContent = mode === "content";
  const sessions = isContent ? contentResults : recentSessions;
  const isLoading = isContent ? contentLoading : recentLoading;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={isContent ? "Search conversation content (min 3 chars)..." : "Filter sessions by title..."}
      filtering={!isContent}
      onSearchTextChange={setSearchText}
      throttle={isContent}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Search Mode"
          onChange={(value) => {
            setMode(value);
            setSearchText("");
          }}
          value={mode}
        >
          <List.Dropdown.Item title="Recent" value="recent" icon={Icon.Clock} />
          <List.Dropdown.Item title="Search Content" value="content" icon={Icon.MagnifyingGlass} />
        </List.Dropdown>
      }
    >
      {sessions.length === 0 && !isLoading ? (
        <List.EmptyView
          title={isContent ? "No Matches" : "No Sessions Found"}
          description={
            isContent
              ? "Try a different search term (min 3 characters)."
              : "Start OpenCode in a terminal to see sessions here."
          }
          icon={isContent ? Icon.MagnifyingGlass : Icon.Message}
        />
      ) : (
        sessions.map((session) => (
          <SessionListItem key={session.id} session={session} liveness={getLiveness(openSessions, session.id)} />
        ))
      )}
    </List>
  );
}
