import { Action, ActionPanel, Detail, Icon, open } from "@raycast/api";
import type { RaycastCard } from "../lib/api";
import { SetRaycastKeyAction } from "./SetRaycastKeyAction";

const TEAK_HOME = "https://app.teakvault.com";

const formatTimestamp = (value: number): string =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);

export function CardDetail({ card }: { card: RaycastCard }) {
  const markdown = [
    `# ${card.metadataTitle || card.content.slice(0, 80) || "Card"}`,
    "",
    `**Type:** ${card.type}`,
    `**Created:** ${formatTimestamp(card.createdAt)}`,
    `**Updated:** ${formatTimestamp(card.updatedAt)}`,
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
            onAction={() => open(TEAK_HOME)}
            title="Open Teak App"
          />
          <SetRaycastKeyAction />
        </ActionPanel>
      }
      markdown={markdown}
    />
  );
}
