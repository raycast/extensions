import { Enhet } from "../types";
import type { Image } from "@raycast/api";

/**
 * Get the display icon for an entity, prioritizing emoji over favicon
 */
export function getEntityIcon(entity: Enhet): Image.ImageLike | undefined {
  return entity.emoji || entity.faviconUrl;
}

/**
 * Check if an entity is a favorite
 */
export function isFavorite(entity: Enhet, favoriteIds: Set<string>): boolean {
  return favoriteIds.has(entity.organisasjonsnummer);
}

/**
 * Get favorite entity data if it exists
 */
export function getFavoriteEntity(entity: Enhet, favoriteById: Map<string, Enhet>): Enhet | undefined {
  return favoriteById.get(entity.organisasjonsnummer);
}

/**
 * Generate Brønnøysundregistrene URL for an entity
 */
export function getBregUrl(organisasjonsnummer: string): string {
  return `https://virksomhet.brreg.no/oppslag/enheter/${organisasjonsnummer}`;
}

/**
 * Check if an entity can be moved up in a list
 */
export function canMoveUp(index: number): boolean {
  return index > 0;
}

/**
 * Check if an entity can be moved down in a list
 */
export function canMoveDown(index: number, totalLength: number): boolean {
  return index < totalLength - 1;
}

/**
 * Get move indicators for favorites based on position and move mode
 */
export function getMoveIndicators(
  index: number,
  totalLength: number,
  showMoveIndicators: boolean,
): Array<{ icon: string; text: string; tooltip: string }> {
  if (!showMoveIndicators) return [];

  const indicators = [];

  if (canMoveUp(index)) {
    indicators.push({
      icon: "Icon.ArrowUp",
      text: "Move up",
      tooltip: "⌘⇧↑ to move up",
    });
  }

  if (canMoveDown(index, totalLength)) {
    indicators.push({
      icon: "Icon.ArrowDown",
      text: "Move down",
      tooltip: "⌘⇧↓ to move down",
    });
  }

  return indicators;
}
