import { Action, ActionPanel, Detail, Icon, open } from "@raycast/api";
import type { RaycastCard } from "../lib/api";
import { TEAK_APP_URL } from "../lib/constants";
import { formatDateTime } from "../lib/dateFormat";
import { SetApiKeyAction } from "./SetApiKeyAction";

export function CardDetail({ card }: { card: RaycastCard }) {
  const markdown = [
    `# ${card.metadataTitle || card.content.slice(0, 80) || "Card"}`,
    "",
    `**Type:** ${card.type}`,
    `**Created:** ${formatDateTime(card.createdAt)}`,
    `**Updated:** ${formatDateTime(card.updatedAt)}`,
    card.url ? `**URL:** ${card.url}` : "",
    card.notes ? `**Notes:**\n${card.notes}` : "",
    card.aiSummary ? `**AI Summary:**\n${card.aiSummary}` : "",
    card.tags.length > 0 ? `**Tags:** ${card.tags.join(", ")}` : "",
    card.aiTags.length > 0 ? `**AI Tags:** ${card.aiTags.join(", ")}` : "",
    "",
    card.content,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <Detail
      actions={
        <ActionPanel>
          {card.url ? (
            <Action.OpenInBrowser title="Open URL" url={card.url} />
          ) : null}
          <Action.CopyToClipboard content={card.content} title="Copy Content" />
          {card.url ? (
            <Action.CopyToClipboard content={card.url} title="Copy URL" />
          ) : null}
          <Action
            icon={Icon.House}
            onAction={() => open(TEAK_APP_URL)}
            title="Open Teak App"
          />
          <SetApiKeyAction />
        </ActionPanel>
      }
      markdown={markdown}
    />
  );
}
