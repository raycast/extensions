import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { JSX } from "react";
import { TrelloCard } from "./trelloResponse.model";
import { CardDetail } from "./components/CardDetail";
import { getDefaultOpenTarget, toTrelloAppUrl } from "./utils/openInTrello";

interface CardListItemProps {
  card: TrelloCard;
}

export const CardListItem = ({ card }: CardListItemProps): JSX.Element => {
  const dueDate = card.due ? new Date(card.due).toLocaleDateString() : "";
  const accessories: List.Item.Accessory[] = [];
  if (card.due) accessories.push({ date: new Date(card.due) });
  if (card.labels?.length) accessories.push({ tag: card.labels.map((label) => label.name).join(", ") });

  const webUrl = card.url ?? card.shortUrl ?? "";
  const openWebAction = <Action.OpenInBrowser url={webUrl} title="Open on Trello Web" icon={Icon.Globe} />;
  const openAppAction = card.url ? (
    <Action.Open title="Open in Trello Desktop" icon={Icon.AppWindow} target={toTrelloAppUrl(card.url)} />
  ) : null;
  const appFirst = getDefaultOpenTarget() === "app";

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
            {appFirst ? openAppAction : openWebAction}
            {appFirst ? openWebAction : openAppAction}
            {card.url ? <Action.CopyToClipboard content={card.url} title="Copy URL" /> : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
