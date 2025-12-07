import { Action, ActionPanel, closeMainWindow, Color, Icon, List } from "@raycast/api";
import type { Card } from "@src/data/cards";
import { createAppleScript } from "@src/utils/cards";
import { runAppleScript } from "@raycast/utils";

/**
 * Props for the Card component.
 */
type CardProps = {
  /** The test card to display */
  card: Card;
  /** Whether to show the card category in the subtitle */
  showCategory?: boolean;
  /** Callback when card is used (for ranking) */
  visitItem: (card: Card) => void;
  /** Callback to reset card's usage ranking */
  resetRanking: (card: Card) => void;
};

/**
 * Card - List item displaying a Stripe test card.
 *
 * Shows test card details with actions to:
 * - Autofill card into active checkout form
 * - Copy card number to clipboard
 * - View card documentation
 * - Reset usage ranking
 *
 * Cards are ranked by usage frequency for quick access to commonly used test cards.
 */
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
