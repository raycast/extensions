import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { WebhookRequest } from "./types";
import { buildBody } from "./utils";

interface Props {
  status: number;
  body: string;
  responseTime: number;
  request: WebhookRequest;
  error?: string;
  onEditInForm?: () => void;
}

function statusLabel(status: number): {
  color: Color;
  emoji: string;
  text: string;
} {
  if (status >= 200 && status < 300) return { color: Color.Green, emoji: "✅", text: "Success" };
  if (status >= 300 && status < 400) return { color: Color.Yellow, emoji: "↩️", text: "Redirect" };
  if (status >= 400 && status < 500) return { color: Color.Orange, emoji: "⚠️", text: "Client Error" };
  return { color: Color.Red, emoji: "❌", text: "Server Error" };
}

function isJson(text: string): boolean {
  const trimmed = text.trim();
  return (
    (trimmed.startsWith("{") || trimmed.startsWith("[")) &&
    (() => {
      try {
        JSON.parse(trimmed);
        return true;
      } catch {
        return false;
      }
    })()
  );
}

function formatResponseBody(body: string): string {
  if (!body) return "_No response body_";
  if (isJson(body)) {
    const pretty = JSON.stringify(JSON.parse(body), null, 2);
    return `\`\`\`json\n${pretty}\n\`\`\``;
  }
  // Plain text / HTML — show as plain text block, not json-highlighted
  return `\`\`\`\n${body}\n\`\`\``;
}

function formatSentBody(sentBody: string | undefined): string {
  if (!sentBody) return "_No body_";
  try {
    const pretty = JSON.stringify(JSON.parse(sentBody), null, 2);
    return `\`\`\`json\n${pretty}\n\`\`\``;
  } catch {
    return `\`\`\`\n${sentBody}\n\`\`\``;
  }
}

export function ResponseView({ status, body, responseTime, request, error, onEditInForm }: Props) {
  const label = statusLabel(status);

  const sentBody = buildBody(request);

  const markdown = error
    ? `## ❌ Request Failed\n\n\`\`\`\n${error}\n\`\`\``
    : `## ${label.emoji} ${status} ${label.text} · ${responseTime}ms

---

${formatResponseBody(body)}

---

### Request Sent

**${request.method}** \`${request.url}\`

${formatSentBody(sentBody)}
`;

  return (
    <Detail
      navigationTitle={error ? "Request Failed" : `${status} · ${responseTime}ms`}
      markdown={markdown}
      metadata={
        !error ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Status" text={{ value: `${status} ${label.text}`, color: label.color }} />
            <Detail.Metadata.Label title="Response Time" text={`${responseTime}ms`} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Method" text={request.method} />
            <Detail.Metadata.Label
              title="URL"
              text={request.url.length > 60 ? request.url.slice(0, 60) + "…" : request.url}
            />
            <Detail.Metadata.Label title="Body Type" text={request.bodyMode === "raw" ? "Raw JSON" : "Key-Value"} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {onEditInForm && (
            <Action
              title="Edit in Form"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
              onAction={onEditInForm}
            />
          )}
          <Action.CopyToClipboard title="Copy Response" content={body} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          {sentBody && (
            <Action.CopyToClipboard
              title="Copy Request Body"
              content={sentBody}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
          <Action.CopyToClipboard title="Copy URL" content={request.url} />
        </ActionPanel>
      }
    />
  );
}
