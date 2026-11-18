import { List } from "@raycast/api";
import { absoluteTime, agentHostLabel, relativeTime, statusLabel } from "../core/format";
import { tildify } from "../core/paths";
import { Session } from "../core/types";
import { isClaudeCloudOnly } from "../core/claude-desktop";

/** ⌘I: the last sentence plus four lines of metadata. Nothing else. */
export function SessionDetail({ session }: { session: Session }) {
  const quote = isClaudeCloudOnly(session)
    ? "This cloud session is saved and can be reopened from Subscriptions. Cloud execution status is not connected, so waiting-for-input alerts are unavailable."
    : session.summary
      ? session.summary.replace(/\n/g, " ")
      : "_No messages yet_";
  const markdown = `### ${escapeMd(session.title || session.sessionId)}\n\n> ${escapeMd(quote)}`;
  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Status" text={statusLabel(session)} />
          <List.Item.Detail.Metadata.Label title="Agent" text={agentHostLabel(session.agent, session.host)} />
          <List.Item.Detail.Metadata.Label title="Project" text={tildify(session.cwd) || "—"} />
          <List.Item.Detail.Metadata.Label title="Started" text={absoluteTime(session.startedAt)} />
          <List.Item.Detail.Metadata.Label title="Last Activity" text={relativeTime(session.updatedAt)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function escapeMd(s: string): string {
  return s.replace(/([\\`*_[\]#<>])/g, "\\$1");
}
