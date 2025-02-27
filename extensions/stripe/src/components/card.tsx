import { Action, ActionPanel, closeMainWindow, Color, Icon, List } from "@raycast/api";
import type { Card } from "../data/cards";
import { createAppleScript } from "../utils/cards";
import { runAppleScript } from "@raycast/utils";

type CardProps = {
  card: Card;
  showCategory?: boolean;
  visitItem: (card: Card) => void;
  resetRanking: (card: Card) => void;
};

const Card = ({ card, showCategory = false, visitItem, resetRanking }: CardProps) => {
  return (
    <List.Item
      title={card.name}
      subtitle={showCategory ? card.category : undefined}
      icon={Icon.CreditCard}
      accessories={[
        {
          tag: {
            value: card.number.toString(),
            color: Color.SecondaryText,
          },
        },
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Fill Checkout"
            icon={Icon.Cart}
            onAction={async () => {
              visitItem(card);
              await closeMainWindow();
              const script = createAppleScript(card);
              await runAppleScript(script);
            }}
          />

          <Action.CopyToClipboard title="Copy Card Number" content={card.number} onCopy={() => visitItem(card)} />

          <Action.OpenInBrowser
            title="View Documentation"
            url={card.link}
            icon={Icon.Book}
            onOpen={() => visitItem(card)}
          />

          <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={() => resetRanking(card)} />
        </ActionPanel>
      }
    />
  );
};

export default Card;
