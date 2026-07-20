/**
 * Shared helper functions for card components.
 */

import { Color } from "@raycast/api";
import type { Card, CardCategory } from "../../api/endpoints";

/**
 * Gets the display status for a card (prefers sub_status over status).
 */
export function getCardStatus(card: Card): string {
  return card.sub_status || card.status || "UNKNOWN";
}

/**
 * Gets the display name for a card.
 * Prefers custom name (second_line), then description, then last 4 digits.
 */
export function getCardName(card: Card): string {
  if (card.second_line) return card.second_line;
  if (card.description) return card.description;
  if (card.primary_account_number_four_digit) return `Card •••• ${card.primary_account_number_four_digit}`;
  if (card.product_type && card.product_type !== "NONE") {
    return card.product_type.replace(/_/g, " ");
  }
  return card.type || "Card";
}

/**
 * Gets a color based on how close the card is to expiring.
 */
export function getExpiryColor(expiryDate: string): Color {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const monthsUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);

  if (monthsUntilExpiry <= 0) return Color.Red;
  if (monthsUntilExpiry <= 3) return Color.Red;
  if (monthsUntilExpiry <= 12) return Color.Orange;
  return Color.Green;
}

/**
 * Formats an expiry date string (e.g., "2029-11-30") to "Nov 29".
 */
export function formatExpiryDate(expiryDate: string): string {
  const date = new Date(expiryDate);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  // Use UTC methods for ISO date strings to avoid timezone issues
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear().toString().slice(-2);
  return `${month} ${year}`;
}

/**
 * Checks if a card is currently active.
 */
export function isCardActive(card: Card): boolean {
  const status = getCardStatus(card).toUpperCase();
  return status === "ACTIVE" || status === "NONE";
}

/**
 * Checks if a card has expired.
 */
export function isCardExpired(card: Card): boolean {
  if (!card.expiry_date) return false;
  const expiry = new Date(card.expiry_date);
  const now = new Date();
  return expiry <= now;
}

/**
 * Gets a human-readable label for a card category.
 */
export function getCardCategoryLabel(category: CardCategory): string {
  switch (category) {
    case "CardDebit":
      return "Physical Cards";
    case "CardCredit":
      return "Virtual Cards";
    case "CardPrepaid":
      return "Prepaid Cards";
    case "CardMaestro":
      return "Maestro Cards";
    default:
      return "Other Cards";
  }
}

/**
 * Groups cards by their category, maintaining display order.
 */
export function groupCardsByCategory(cards: Card[]): Map<CardCategory, Card[]> {
  const groups = new Map<CardCategory, Card[]>();
  const categoryOrder: CardCategory[] = ["CardDebit", "CardCredit", "CardPrepaid", "CardMaestro"];

  for (const category of categoryOrder) {
    groups.set(category, []);
  }

  for (const card of cards) {
    const category = card.cardCategory;
    if (groups.has(category)) {
      groups.get(category)!.push(card);
    } else {
      groups.get("CardCredit")!.push(card);
    }
  }

  for (const category of categoryOrder) {
    if (groups.get(category)!.length === 0) {
      groups.delete(category);
    }
  }

  return groups;
}

/**
 * Common country options for card permissions.
 */
export const COUNTRY_OPTIONS = [
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "PT", name: "Portugal" },
  { code: "AT", name: "Austria" },
  { code: "CH", name: "Switzerland" },
  { code: "GB", name: "United Kingdom" },
  { code: "IE", name: "Ireland" },
  { code: "LU", name: "Luxembourg" },
  { code: "DK", name: "Denmark" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "FI", name: "Finland" },
  { code: "PL", name: "Poland" },
  { code: "CZ", name: "Czech Republic" },
  { code: "GR", name: "Greece" },
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "JP", name: "Japan" },
  { code: "CN", name: "China" },
  { code: "SG", name: "Singapore" },
  { code: "HK", name: "Hong Kong" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "TH", name: "Thailand" },
  { code: "ID", name: "Indonesia" },
  { code: "TR", name: "Turkey" },
];
