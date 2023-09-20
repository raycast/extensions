import { SHORTCUT_KEY_SEQUENCE } from "~/constants/general";
import { CARD_KEY_LABEL } from "~/constants/labels";
import { CARD_BRANDS, Card, CardBrand } from "~/types/vault";

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
  expMonth: (value: string) => MONTH_NUMBER_TO_LABEL_MAP[value] ?? value,
};

const getCardValue = (key: string, value: string) => {
  return CARD_MAPPER[key as keyof Card]?.(value) ?? value;
};

export function getCardDetailsMarkdown(itemName: string, card: Card) {
  return `# 💳 ${itemName}
&nbsp;
| ⌘\t**Field** | **Value** |
| --- | --- |
${Object.entries(card)
  .map(([key, value], index) => {
    if (!value) return null;
    const label = CARD_KEY_LABEL[key as keyof Card];
    const shortcutKey = SHORTCUT_KEY_SEQUENCE[index];

    return `| ${shortcutKey ? `${shortcutKey}.` : "&nbsp;"}\t**${label}** | ${getCardValue(key, value)} |`;
  })
  .filter(Boolean)
  .join("\n")}
`;
}

export function getCardDetailsCopyValue(card: Card) {
  return Object.entries(card)
    .map(([key, value]) => (value ? `${CARD_KEY_LABEL[key as keyof Card]}: ${getCardValue(key, value)}` : null))
    .filter(Boolean)
    .join("\n");
}

const CARD_KEY_LABEL_KEYS = Object.keys(CARD_KEY_LABEL);
/** sorts the fields according to the order they appear on bitwarden's web vault form */
export function cardBitwardenPageFieldOrderSorter([a]: string | [string, any], [b]: string | [string, any]) {
  const aIndex = CARD_KEY_LABEL_KEYS.indexOf((Array.isArray(a) ? a[0] : a) as keyof Card);
  const bIndex = CARD_KEY_LABEL_KEYS.indexOf((Array.isArray(b) ? b[0] : b) as keyof Card);
  return aIndex - bIndex;
}

const BASE_CARD_IMAGE_URL = "https://vault.bitwarden.com/images";
const CARD_BRANDS_TO_IMAGE_URL_MAP: Partial<Record<CardBrand, string>> = {
  [CARD_BRANDS.VISA]: `${BASE_CARD_IMAGE_URL}/visa-light.png`,
  [CARD_BRANDS.MASTERCARD]: `${BASE_CARD_IMAGE_URL}/mastercard-light.png`,
  [CARD_BRANDS.AMEX]: `${BASE_CARD_IMAGE_URL}/amex-light.png`,
  [CARD_BRANDS.DISCOVER]: `${BASE_CARD_IMAGE_URL}/discover-light.png`,
  [CARD_BRANDS.DINERS_CLUB]: `${BASE_CARD_IMAGE_URL}/diners_club-light.png`,
  [CARD_BRANDS.JCB]: `${BASE_CARD_IMAGE_URL}/jcb-light.png`,
  [CARD_BRANDS.MAESTRO]: `${BASE_CARD_IMAGE_URL}/maestro-light.png`,
  [CARD_BRANDS.UNION_PAY]: `${BASE_CARD_IMAGE_URL}/union_pay-light.png`,
  [CARD_BRANDS.RU_PAY]: `${BASE_CARD_IMAGE_URL}/ru_pay-light.png`,
};

export function getCardImageUrl(brand: CardBrand): string | undefined {
  return CARD_BRANDS_TO_IMAGE_URL_MAP[brand];
}
