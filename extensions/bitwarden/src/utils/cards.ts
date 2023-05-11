import { Card } from "~/types/vault";

const MONTH_NUMBER_TO_LABEL_MAP = {
  1: "01 - January",
  2: "02 - February",
  3: "03 - March",
  4: "04 - April",
  5: "05 - May",
  6: "06 - June",
  7: "07 - July",
  8: "08 - August",
  9: "09 - September",
  10: "10 - October",
  11: "11 - November",
  12: "12 - December",
} as Record<string, string>;

const CARD_MAPPER: Record<string, (value: string) => string> = {
  expMonth: (value: string) => MONTH_NUMBER_TO_LABEL_MAP[value],
};

const CARD_KEY_LABEL: Record<keyof Card, string> = {
  cardholderName: "Cardholder name",
  number: "Number",
  code: "Security code (CVV)",
  expMonth: "Expiration month",
  expYear: "Expiration year",
  brand: "Brand",
};

const getCardValue = (key: string, value: string) => {
  return CARD_MAPPER[key as keyof Card]?.(value) ?? value;
};

export function getCardDetailsMarkdown(itemName: string, card: Card) {
  return `# 💳 ${itemName}
<br></br>
| **Field** | **Value** |
| --- | --- |
${Object.entries(card)
  .map(([key, value]) => (value ? `| **${CARD_KEY_LABEL[key as keyof Card]}** | ${getCardValue(key, value)} |` : null))
  .join("\n")}
`;
}

export function getCardDetailsCopyValue(card: Card) {
  return Object.entries(card)
    .map(([key, value]) => (value ? `${CARD_KEY_LABEL[key as keyof Card]}: ${getCardValue(key, value)}` : null))
    .filter(Boolean)
    .join("\n");
}
