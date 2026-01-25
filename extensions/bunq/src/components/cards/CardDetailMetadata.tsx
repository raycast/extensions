/**
 * Card detail metadata component for the List detail view.
 */

import { List, Color } from "@raycast/api";
import type { Card } from "../../api/endpoints";
import { getCardStatusAppearance } from "../../lib/status-helpers";
import { formatDate } from "../../lib/formatters";
import { getCardStatus, getCardName } from "./card-helpers";

interface CardDetailMetadataProps {
  card: Card;
}

export function CardDetailMetadata({ card }: CardDetailMetadataProps) {
  const statusAppearance = getCardStatusAppearance(getCardStatus(card));
  const dailyLimit = card.limit?.[0]?.daily_limit;
  const currency = card.limit?.[0]?.currency || "EUR";

  const cardTypeInfo = [card.type, card.sub_type, card.product_type].filter((t) => t && t !== "NONE").join(" · ");

  const cardFeatures: { text: string; color: Color }[] = [];
  if (card.type === "MASTERCARD") {
    cardFeatures.push({ text: "Mastercard", color: Color.Orange });
  }
  if (card.sub_type === "VIRTUAL") {
    cardFeatures.push({ text: "Virtual", color: Color.Purple });
  } else if (card.sub_type === "PHYSICAL") {
    cardFeatures.push({ text: "Physical", color: Color.Blue });
  }
  if (card.pin_code_assignment?.some((p) => p.type === "PRIMARY")) {
    cardFeatures.push({ text: "PIN", color: Color.Green });
  }

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Card Name" text={getCardName(card)} />
          {card.name_on_card && <List.Item.Detail.Metadata.Label title="Name on Card" text={card.name_on_card} />}
          {card.primary_account_number_four_digit && (
            <List.Item.Detail.Metadata.Label
              title="Card Number"
              text={`•••• •••• •••• ${card.primary_account_number_four_digit}`}
            />
          )}
          {card.expiry_date && <List.Item.Detail.Metadata.Label title="Expires" text={card.expiry_date} />}
          <List.Item.Detail.Metadata.Label title="Type" text={cardTypeInfo || "Unknown"} />
          <List.Item.Detail.Metadata.Label
            title="Status"
            text={{ value: statusAppearance.label, color: statusAppearance.color }}
          />
          {cardFeatures.length > 0 && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Features">
                {cardFeatures.map((feature) => (
                  <List.Item.Detail.Metadata.TagList.Item
                    key={feature.text}
                    text={feature.text}
                    color={feature.color}
                  />
                ))}
              </List.Item.Detail.Metadata.TagList>
            </>
          )}
          <List.Item.Detail.Metadata.Separator />
          {card.label_monetary_account_current?.display_name && (
            <List.Item.Detail.Metadata.Label
              title="Linked Account"
              text={card.label_monetary_account_current.display_name}
            />
          )}
          {card.label_monetary_account_current?.iban && (
            <List.Item.Detail.Metadata.Label title="IBAN" text={card.label_monetary_account_current.iban} />
          )}
          {dailyLimit && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Daily Limit" text={`${currency} ${dailyLimit}`} />
            </>
          )}
          {card.country_permission && card.country_permission.length > 0 && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Allowed Countries"
                text={
                  card.country_permission
                    .map((c) => c.country)
                    .filter(Boolean)
                    .join(", ") || "All"
                }
              />
            </>
          )}
          <List.Item.Detail.Metadata.Separator />
          {card.created && <List.Item.Detail.Metadata.Label title="Created" text={formatDate(card.created)} />}
          <List.Item.Detail.Metadata.Link title="Open bunq" target="https://bunq.com/app" text="Open in bunq app" />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
