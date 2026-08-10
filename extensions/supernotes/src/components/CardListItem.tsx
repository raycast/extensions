import { Action, ActionPanel, Icon, List } from "@raycast/api";

import CommonCardActions, { ViewCardAction } from "~/components/CommonCardActions";
import { determineCardColor } from "~/utils/mapping";
import { sendToCard } from "~/utils/senders";
import { ICard } from "~/utils/types";

interface CardDetailListItemProps {
  card: ICard;
  detail?: React.ReactNode;
  removeFromList?: (cardId: string) => void;
}

export const CardDetailListItem = ({ card, removeFromList }: CardDetailListItemProps) => {
  return (
    <List.Item
      title={card.data.name}
      subtitle={card.data.name === "" ? "Untitled" : undefined}
      icon={{
        source: Icon.Circle,
        tintColor: determineCardColor(card),
      }}
      detail={<List.Item.Detail markdown={card.data.markup} />}
      actions={
        <ActionPanel>
          <ViewCardAction card={card} />
          <CommonCardActions card={card} removeFromList={removeFromList} />
        </ActionPanel>
      }
    />
  );
};

interface CardAppendListItemProps {
  card: ICard;
  detail: React.ReactNode;
  text: string;
}

export const CardAppendListItem = ({ card, detail, text }: CardAppendListItemProps) => {
  return (
    <List.Item
      title={card.data.name}
      subtitle={card.data.name === "" ? "Untitled" : undefined}
      detail={detail}
      icon={{
        source: Icon.Circle,
        tintColor: determineCardColor(card),
      }}
      actions={
        <ActionPanel>
          <Action
            title="Append to Card"
            icon={Icon.PlusCircle}
            onAction={() => sendToCard(text, card)}
          />
          <ViewCardAction card={card} />
          <CommonCardActions card={card} />
        </ActionPanel>
      }
    />
  );
};
