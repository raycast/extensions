/**
 * Base URL for square airline logo tiles, keyed by 2-character IATA code.
 * Served by the images.kiwi.com logo CDN — no API key required.
 */
const LOGO_BASE = "https://images.kiwi.com/airlines/64x64";

/**
 * Build the URL of an airline's square logo tile for a 2-character IATA code
 * (e.g. "UA", "VY", "5X"). Returns null for a missing or malformed code so the
 * caller can fall back to a built-in icon.
 *
 * The CDN does not carry every airline; a 404 is handled by the caller's image
 * fallback rather than here.
 */
export function airlineLogoUrl(
  iataCode: string | null | undefined,
): string | null {
  if (!iataCode) {
    return null;
  }
  const code = iataCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{2}$/.test(code)) {
    return null;
  }
  return `${LOGO_BASE}/${code}.png`;
}
