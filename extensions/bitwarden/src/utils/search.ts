import { Icon } from "@raycast/api";
import { URL } from "url";
import { Item } from "~/types/vault";

export function extractKeywords(item: Item): string[] {
  const keywords: (string | null | undefined)[] = [item.name];
  if (item.card) {
    const { brand, number } = item.card;
    keywords.push(brand);
    if (number !== null) {
      // Similar to Bitwarden, use the last 5 digits if the card is Amex
      const isAmex = /^3[47]/.test(number);
      keywords.push(number.substring(number.length - (isAmex ? 5 : 4), number.length));
    }
  }
  keywords.push(item.login?.username);
  if (item.login?.uris) {
    for (const uri of item.login.uris) {
      if (uri.uri !== null) {
        try {
          keywords.push(...new URL(uri.uri).hostname.split("."));
        } catch (error) {
          // Invalid hostname
        }
      }
    }
  }
  // Unique keywords
  const uniqueKeywords = new Set(keywords.filter((keyword): keyword is string => !!keyword));
  return [...uniqueKeywords];
}

export function faviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://icons.bitwarden.net/${domain}/icon.png`;
  } catch (err) {
    return Icon.Globe;
  }
}
