import { List } from "@raycast/api";
import { absoluteTime, agentHostLabel, relativeTime, statusLabel } from "../core/format";
import { Translator } from "../core/messages";
import { tildify } from "../core/paths";
import { Session } from "../core/types";
import { isClaudeCloudOnly } from "../core/claude-desktop";

/** ⌘I: the last sentence plus four lines of metadata. Nothing else. */
export function SessionDetail({ session, t }: { session: Session; t: Translator }) {
  const quote = isClaudeCloudOnly(session)
    ? t("meta.cloudUnavailable")
    : session.summary
      ? session.summary.replace(/\n/g, " ")
      : `_${t("meta.noSummary")}_`;
  const markdown = `### ${escapeMd(session.title || session.sessionId)}\n\n> ${escapeMd(quote)}`;
  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title={t("meta.status")} text={statusLabel(session, t)} />
          <List.Item.Detail.Metadata.Label title={t("meta.agent")} text={agentHostLabel(session.agent, session.host, t)} />
          <List.Item.Detail.Metadata.Label title={t("meta.project")} text={tildify(session.cwd) || "—"} />
          <List.Item.Detail.Metadata.Label title={t("meta.started")} text={absoluteTime(session.startedAt, t)} />
          <List.Item.Detail.Metadata.Label title={t("meta.activity")} text={relativeTime(session.updatedAt, t)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function escapeMd(s: string): string {
  return s.replace(/([\\`*_[\]#<>])/g, "\\$1");
}
