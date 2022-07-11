import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";

import { ColorMap } from "../util/mapping";
import { ICard } from "../util/types";
import CardDetail from "./CardDetail";

const CardListItem = ({ card }: { card: ICard }) => {
  return (
    <List.Item
      title={card.data.name}
      icon={{
        source: Icon.Circle,
        tintColor: card.membership.color ? ColorMap[card.membership.color] : Color.SecondaryText,
      }}
      actions={
        <ActionPanel>
          <Action.Push title="View Card" icon={Icon.Document} target={<CardDetail card={card} />} />
          <Action.CopyToClipboard title="Copy HTML" content={card.data.html} icon={Icon.Clipboard} />
          <Action.CopyToClipboard title="Copy Markdown" content={card.data.markup} icon={Icon.Clipboard} />
        </ActionPanel>
      }
    />
  );
};

export default CardListItem;
