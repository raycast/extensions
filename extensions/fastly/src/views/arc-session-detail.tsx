import { Detail, ActionPanel, Action } from "@raycast/api";
import { ArcSession } from "../types";

interface ArcSessionDetailProps {
  session: ArcSession;
}

function prettyJson(raw?: string): string {
  if (!raw) return "_empty_";
  try {
    return "```json\n" + JSON.stringify(JSON.parse(raw), null, 2) + "\n```";
  } catch {
    return "```\n" + raw + "\n```";
  }
}

export function ArcSessionDetail({ session }: ArcSessionDetailProps) {
  const logs = session.logs || [];

  const markdown = [
    `# Session ${session.id}`,
    logs.length === 0 ? "_No request/response logs recorded for this session._" : "",
    ...logs.map((log, index) =>
      [
        `## Exchange ${index + 1}`,
        "### Request",
        prettyJson(log.request),
        "### Response",
        prettyJson(log.response),
      ].join("\n\n"),
    ),
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <Detail
      markdown={markdown}
      navigationTitle={session.virtual_key_name || session.id}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Virtual Key" text={session.virtual_key_name || session.virtual_key_id || "—"} />
          <Detail.Metadata.Label title="Provider" text={session.provider || "—"} />
          <Detail.Metadata.Label title="Model" text={session.model || "—"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Requests" text={String(session.requests ?? 0)} />
          <Detail.Metadata.Label title="Input Tokens" text={(session.input_tokens ?? 0).toLocaleString()} />
          <Detail.Metadata.Label title="Output Tokens" text={(session.output_tokens ?? 0).toLocaleString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Started" text={new Date(session.created_at).toLocaleString()} />
          {session.updated_at && (
            <Detail.Metadata.Label title="Last Activity" text={new Date(session.updated_at).toLocaleString()} />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Session ID" content={session.id} />
        </ActionPanel>
      }
    />
  );
}
