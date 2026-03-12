import { Enhet } from "../types";
import type { Image } from "@raycast/api";
import { Clipboard, Icon, showToast, Toast } from "@raycast/api";

/**
 * Get the display icon for an entity, prioritizing emoji over favicon.
 * Falls back to Icon.Globe when neither is set.
 */
export function getEntityIcon(entity: Enhet, searchFaviconUrl?: Image.ImageLike): Image.ImageLike {
  return entity.emoji || entity.faviconUrl || searchFaviconUrl || Icon.Globe;
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
 * Normalize website URL from BRREG fields for consistent usage.
 */
export function normalizeWebsiteUrl(rawWebsite?: string): string | undefined {
  if (!rawWebsite) return undefined;

  let website = rawWebsite.trim();
  website = website.replace(/^[^\w]+|[^\w./-]+$/g, "");
  if (!website) return undefined;

  if (!website.startsWith("http://") && !website.startsWith("https://")) {
    website = `https://${website}`;
  }

  try {
    new URL(website);
    return website;
  } catch {
    return undefined;
  }
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
): Array<{ icon: Image.ImageLike; text: string; tooltip: string }> {
  if (!showMoveIndicators) return [];

  const indicators = [];

  if (canMoveUp(index)) {
    indicators.push({
      icon: Icon.ArrowUp,
      text: "Move up",
      tooltip: "⌘⇧↑ to move up",
    });
  }

  if (canMoveDown(index, totalLength)) {
    indicators.push({
      icon: Icon.ArrowDown,
      text: "Move down",
      tooltip: "⌘⇧↓ to move down",
    });
  }

  return indicators;
}

/**
 * Normalize VAT registration status across different entity shapes.
 *
 * - `Company` uses `isVatRegistered`
 * - BRREG entities may provide `mvaRegistrert` or `registrertIMvaregisteret`
 */
export function getVatRegistrationStatus(entity: {
  isVatRegistered?: boolean;
  mvaRegistrert?: boolean;
  registrertIMvaregisteret?: boolean;
}): boolean | undefined {
  if (typeof entity.isVatRegistered === "boolean") return entity.isVatRegistered;
  if (typeof entity.mvaRegistrert === "boolean") return entity.mvaRegistrert;
  if (typeof entity.registrertIMvaregisteret === "boolean") return entity.registrertIMvaregisteret;
  return undefined;
}

/**
 * Format Norwegian organization number as VAT number (NO {orgnr} MVA)
 */
export function formatNorwegianVatNumber(orgNumber: string): string {
  const trimmed = orgNumber.trim().replace(/\s+/g, "");
  return `NO ${trimmed} MVA`;
}

/**
 * Copy the Norwegian VAT number for a company to clipboard.
 * Shows a failure toast if the company is not VAT-registered or status is unknown.
 */
export async function copyVatNumberToClipboard(
  orgNumber: string,
  name: string,
  vatStatus: boolean | undefined,
  successMessage?: (vatNumber: string) => string,
  notVatRegisteredMessage?: (name: string) => string,
): Promise<void> {
  if (vatStatus !== true) {
    const title = vatStatus === false ? "Not VAT Registered" : "VAT Status Unknown";
    const message =
      vatStatus === false
        ? notVatRegisteredMessage
          ? notVatRegisteredMessage(name)
          : `${name} is not registered for VAT`
        : `VAT registration status for ${name} is unknown`;
    await showToast({ style: Toast.Style.Failure, title, message });
    return;
  }

  const vatNumber = formatNorwegianVatNumber(orgNumber);
  await Clipboard.copy(vatNumber);
  await showToast({
    style: Toast.Style.Success,
    title: "VAT Number Copied",
    message: successMessage ? successMessage(vatNumber) : vatNumber,
  });
}
