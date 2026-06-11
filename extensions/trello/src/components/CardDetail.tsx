import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { trelloClient } from "../utils/trelloClient";
import { TrelloCardDetails } from "../trelloResponse.model";

type Props = { cardId: string };

export function CardDetail({ cardId }: Props) {
  const [card, setCard] = useState<TrelloCardDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trelloClient
      .getCardDetails(cardId)
      .then((result) => setCard(result))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load card details"))
      .finally(() => setLoading(false));
  }, [cardId]);

  const markdown = error ? `**Error:** ${error}` : card ? buildMarkdown(card) : "Loading card details...";

  return (
    <Detail
      isLoading={loading}
      markdown={markdown}
      actions={
        card ? (
          <ActionPanel>
            {card.url ? <Action.OpenInBrowser title="Open in Trello" url={card.url} icon={Icon.Globe} /> : null}
            {card.url ? <Action.CopyToClipboard title="Copy URL" content={card.url} /> : null}
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

function buildMarkdown(card: TrelloCardDetails) {
  const lines: string[] = [];
  lines.push(`# ${card.name}`);
  if (card.desc) {
    lines.push(card.desc);
  }

  if (card.labels?.length) {
    lines.push(`\n**Labels:** ${card.labels.map((l) => l.name || l.color || l.id).join(", ")}`);
  }
  if (card.due) {
    lines.push(`**Due:** ${new Date(card.due).toLocaleString()}`);
  }
  if (card.checklists?.length) {
    lines.push("\n## Checklists");
    card.checklists.forEach((cl) => {
      lines.push(`- **${cl.name}**`);
      cl.checkItems.forEach((item) => {
        const check = item.state === "complete" ? "☑️" : "⬜️";
        lines.push(`  - ${check} ${item.name}`);
      });
    });
  }

  if (card.attachments?.length) {
    lines.push("\n## Attachments");
    card.attachments.forEach((att) => {
      const size = att.bytes ? ` (${Math.round(att.bytes / 1024)} KB)` : "";
      lines.push(`- [${att.name}](${att.url})${size}`);
    });
  }
  return lines.join("\n");
}
