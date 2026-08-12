import { Detail, ActionPanel, Action, Icon, Keyboard, Color } from "@raycast/api";
import { AuditEvent } from "../types";
import { getEvent } from "../api";
import { useCachedPromise } from "@raycast/utils";
import { getEventTypeInfo, formatRelativeTime } from "./audit-event-list";

interface AuditEventDetailProps {
  event: AuditEvent;
}

function obfuscateToken(tokenId: string | undefined): string {
  if (!tokenId) return "N/A";
  if (tokenId.length <= 8) return "****";
  return `${tokenId.slice(0, 4)}...${tokenId.slice(-4)}`;
}

function formatMetadata(metadata: Record<string, unknown>): string {
  if (!metadata || Object.keys(metadata).length === 0) {
    return "No additional metadata";
  }

  try {
    // Obfuscate any token-like values in metadata
    const sanitized = JSON.parse(JSON.stringify(metadata));
    for (const key of Object.keys(sanitized)) {
      if (key.toLowerCase().includes("token") && typeof sanitized[key] === "string") {
        sanitized[key] = obfuscateToken(sanitized[key] as string);
      }
    }
    return JSON.stringify(sanitized, null, 2);
  } catch {
    return String(metadata);
  }
}

export function AuditEventDetail({ event: initialEvent }: AuditEventDetailProps) {
  const {
    isLoading,
    data: freshEvent,
    revalidate,
  } = useCachedPromise(
    async (eventId: string) => {
      const response = await getEvent(eventId);
      return response.data;
    },
    [initialEvent.id],
    {
      initialData: initialEvent,
      failureToastOptions: { title: "Failed to load event details" },
    },
  );

  const event = freshEvent || initialEvent;
  const info = getEventTypeInfo(event.attributes.event_type);
  const metadata = formatMetadata(event.attributes.metadata);
  const timestamp = new Date(event.attributes.created_at).toLocaleString();
  const relativeTime = formatRelativeTime(event.attributes.created_at);

  const markdown = `# ${event.attributes.description || event.attributes.event_type}

**Event Type**: ${info.label}
**Time**: ${timestamp} (${relativeTime})

---

## Details

| Field | Value |
|-------|-------|
| Event ID | \`${event.id}\` |
| Event Type | \`${event.attributes.event_type}\` |
| Actor | ${event.attributes.user_id || "System"} |
| IP Address | ${event.attributes.ip || "N/A"} |
| Service | ${event.attributes.service_id || "N/A"} |
| Token | ${obfuscateToken(event.attributes.token_id)} |
| Admin Action | ${event.attributes.admin ? "Yes" : "No"} |

---

## Metadata

\`\`\`json
${metadata}
\`\`\`
`;

  const exportableEvent = {
    id: event.id,
    ...event.attributes,
    token_id: obfuscateToken(event.attributes.token_id),
  };

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      navigationTitle={event.attributes.event_type}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Event Type"
            text={info.label}
            icon={{ source: info.icon, tintColor: info.color }}
          />
          <Detail.Metadata.Label title="Event ID" text={event.id} icon={Icon.Fingerprint} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Timestamp" text={timestamp} icon={Icon.Clock} />
          <Detail.Metadata.Label title="Relative" text={relativeTime} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Actor" text={event.attributes.user_id || "System"} icon={Icon.Person} />
          <Detail.Metadata.Label title="IP Address" text={event.attributes.ip || "N/A"} icon={Icon.Network} />
          <Detail.Metadata.Label title="Token" text={obfuscateToken(event.attributes.token_id)} icon={Icon.Key} />
          {event.attributes.admin && (
            <Detail.Metadata.TagList title="Flags">
              <Detail.Metadata.TagList.Item text="Admin" color={Color.Red} />
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
          {event.attributes.service_id && (
            <Detail.Metadata.Label title="Service ID" text={event.attributes.service_id} icon={Icon.Globe} />
          )}
          {event.attributes.customer_id && (
            <Detail.Metadata.Label title="Customer ID" text={event.attributes.customer_id} icon={Icon.Building} />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Event ID" content={event.id} icon={Icon.Clipboard} />
            <Action.CopyToClipboard
              title="Copy as JSON"
              content={JSON.stringify(exportableEvent, null, 2)}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "c" },
                Windows: { modifiers: ["ctrl", "shift"], key: "c" },
              }}
            />
            <Action.CopyToClipboard
              title="Copy Description"
              content={event.attributes.description || event.attributes.event_type}
            />
            {event.attributes.ip && <Action.CopyToClipboard title="Copy IP Address" content={event.attributes.ip} />}
            {event.attributes.service_id && (
              <Action.CopyToClipboard title="Copy Service ID" content={event.attributes.service_id} />
            )}
            {event.attributes.user_id && (
              <Action.CopyToClipboard title="Copy User ID" content={event.attributes.user_id} />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Quick Access">
            <Action
              title="Refresh Details"
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
              shortcut={Keyboard.Shortcut.Common.Refresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
