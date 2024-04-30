import { Action, ActionPanel, Icon, List } from "@raycast/api";

import { determineCardColor } from "utils/mapping";
import { ICard } from "utils/types";

import CardDetail from "components/CardDetail";
import CommonCardActions from "components/CommonCardActions";

interface CardListItemProps {
  card: ICard;
  removeFromList?: (cardId: string) => void;
}

const CardListItem = ({ card, removeFromList }: CardListItemProps) => {
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
          <Action.Push title="View Card" icon={Icon.BlankDocument} target={<CardDetail card={card} />} />
          <CommonCardActions card={card} removeFromList={removeFromList} />
        </ActionPanel>
      }
    />
  );
};

export default CardListItem;
