import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type { Card } from "../lib/types";
import { formatDate, getCardStatusIcon } from "../lib/utils";
import { CARD_STATUS_LABELS } from "../lib/constants";
import { AccountSwitcherActions } from "./AccountSwitcher";

interface CardListItemProps {
  card: Card;
  showDetail?: boolean;
  toggleDetail?: () => void;
}

function CardDetail({ card }: { card: Card }) {
  const statusIcon = getCardStatusIcon(card.status);
  const statusLabel = CARD_STATUS_LABELS[card.status] ?? card.status;
  const networkLabel =
    card.network === "visa"
      ? "Visa"
      : card.network === "mastercard"
        ? "Mastercard"
        : card.network;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Cardholder"
            text={card.nameOnCard}
          />
          <List.Item.Detail.Metadata.Label
            title="Last Four"
            text={card.lastFourDigits}
          />
          <List.Item.Detail.Metadata.Label
            title="Network"
            text={networkLabel}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={statusLabel}
              color={statusIcon.tintColor}
            />
          </List.Item.Detail.Metadata.TagList>
          {card.physicalCardStatus && (
            <List.Item.Detail.Metadata.Label
              title="Physical Card"
              text={card.physicalCardStatus}
            />
          )}
          <List.Item.Detail.Metadata.Label
            title="Created"
            text={formatDate(card.createdAt)}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Link
            title="Dashboard"
            target={`https://app.mercury.com/cards/${card.cardId}`}
            text="Open in Mercury"
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export function CardListItem({
  card,
  showDetail = false,
  toggleDetail,
}: CardListItemProps) {
  const statusIcon = getCardStatusIcon(card.status);
  const statusLabel = CARD_STATUS_LABELS[card.status] ?? card.status;
  const networkLabel =
    card.network === "visa"
      ? "Visa"
      : card.network === "mastercard"
        ? "Mastercard"
        : card.network;

  const accessories: List.Item.Accessory[] = showDetail
    ? [{ text: `•••• ${card.lastFourDigits}` }]
    : [
        { tag: networkLabel },
        ...(card.physicalCardStatus
          ? [{ tag: `Physical: ${card.physicalCardStatus}` }]
          : []),
        {
          tag: {
            value: statusLabel,
            color: statusIcon.tintColor,
          },
        },
        { text: formatDate(card.createdAt) },
      ];

  return (
    <List.Item
      title={card.nameOnCard}
      subtitle={showDetail ? undefined : `•••• ${card.lastFourDigits}`}
      icon={{
        source: Icon.CreditCard,
        tintColor: card.status === "active" ? Color.Green : Color.SecondaryText,
      }}
      accessories={accessories}
      detail={showDetail ? <CardDetail card={card} /> : undefined}
      keywords={[card.nameOnCard, card.lastFourDigits, card.network]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open in Mercury"
              url={`https://app.mercury.com/cards/${card.cardId}`}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            <Action.CopyToClipboard
              title="Copy Cardholder Name"
              content={card.nameOnCard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Last Four Digits"
              content={card.lastFourDigits}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            {toggleDetail && (
              <Action
                title={showDetail ? "Hide Details" : "Show Details"}
                icon={Icon.Sidebar}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                onAction={toggleDetail}
              />
            )}
            <Action.CopyToClipboard
              title="Copy Card Id"
              content={card.cardId}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <AccountSwitcherActions />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}