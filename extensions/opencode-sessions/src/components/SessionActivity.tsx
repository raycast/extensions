import { Action, ActionPanel, Detail, Icon } from "@raycast/api";

import { Todo } from "@opencode-ai/sdk/v2/client";

import { MessageWithParts, useSessionMessages, useSessionTodos } from "../hooks/useSessions";
import { resumeSession } from "../lib/terminal";
import { Session } from "../types";

interface SessionActivityProps {
  session: Session;
}

export function SessionActivity({ session }: SessionActivityProps) {
  const { data: todos = [] } = useSessionTodos(session.id);
  const { data: messages = [] } = useSessionMessages(session.id);

  const todoSection =
    todos.length > 0
      ? `## Tasks\n\n${todos
          .map((t: Todo) => {
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
      ? `## Recent Activity\n\n${(messages as MessageWithParts[])
          .map((m) => {
            const roleIcon = m.info.role === "user" ? "👤" : "🤖";
            const textPart = m.parts.find((p) => p.type === "text");
            const text = textPart?.text ?? "";
            const truncated = text.length > 120 ? text.slice(0, 117) + "..." : text;
            return `${roleIcon} ${truncated}`;
          })
          .join("\n\n")}`
      : "";

  const markdown = [`# ${session.title || session.slug}`, todoSection, activitySection].filter(Boolean).join("\n\n");

  return (
    <Detail
      markdown={markdown}
      navigationTitle={session.title || session.slug}
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
