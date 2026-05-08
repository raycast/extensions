import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { JSX } from "react";
import { TrelloCard } from "./trelloResponse.model";
import { CardDetail } from "./components/CardDetail";

interface CardListItemProps {
  card: TrelloCard;
}

export const CardListItem = ({ card }: CardListItemProps): JSX.Element => {
  const dueDate = card.due ? new Date(card.due).toLocaleDateString() : "";
  const accessories: List.Item.Accessory[] = [];
  if (card.due) accessories.push({ date: new Date(card.due) });
  if (card.labels?.length) accessories.push({ tag: card.labels.map((label) => label.name).join(", ") });

  return (
    <List.Item
      id={card.id}
      title={card.name}
      subtitle={card.desc}
      icon={card.dueComplete ? Icon.CheckCircle : Icon.Checkmark}
      accessories={accessories}
      keywords={card.labels?.map((label) => label.name)}
      actions={
        <ActionPanel>
          <Action.Push title="View Details" icon={Icon.Eye} target={<CardDetail cardId={card.id} />} />
          <ActionPanel.Section title="Links">
            <Action.OpenInBrowser url={card.url ?? card.shortUrl ?? ""} title="Open on Trello Web" icon={Icon.Globe} />
            {card.url ? (
              <Action.OpenInBrowser url={card.url.replace("https", "trello")} title="Open in Trello Desktop" />
            ) : null}
            {card.url ? <Action.CopyToClipboard content={card.url} title="Copy URL" /> : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
