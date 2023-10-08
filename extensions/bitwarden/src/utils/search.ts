import { Icon } from "@raycast/api";
import { URL } from "url";
import { ITEM_TYPE_TO_LABEL } from "~/constants/labels";
import { Item, ItemType } from "~/types/vault";

export function extractKeywords(item: Item): string[] {
  const keywords: string[] = [item.name, ITEM_TYPE_TO_LABEL[item.type]];

  if (item.type === ItemType.LOGIN) {
    const { username, uris } = item.login ?? {};

    if (username) keywords.push(username);
    if (uris) {
      for (const uri of uris) {
        if (uri.uri != null) {
          try {
            keywords.push(...new URL(uri.uri).hostname.split("."));
          } catch (error) {
            // Invalid hostname
          }
        }
      }
    }
  } else if (item.type === ItemType.CARD) {
    const { brand, number } = item.card ?? {};

    if (brand) keywords.push(brand);
    if (number) {
      // Similar to Bitwarden, use the last 5 digits if the card is Amex
      const isAmex = /^3[47]/.test(number);
      keywords.push(number.substring(number.length - (isAmex ? 5 : 4), number.length));
    }
  }

  // remove duplicates and invalid keywords
  return Array.from(new Set(keywords.filter(Boolean)));
}

export function faviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://icons.bitwarden.net/${domain}/icon.png`;
  } catch (err) {
    return Icon.Globe;
  }
}
