/** Builds a base64 SVG data URI previewing foreground text on the background. */
export function previewImage(
  foregroundHex: string,
  backgroundHex: string,
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="300" viewBox="0 0 720 300">
  <rect width="720" height="300" rx="20" fill="${backgroundHex}"/>
  <text x="48" y="128" font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="96" font-weight="700" fill="${foregroundHex}">Aa</text>
  <text x="210" y="96" font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="34" font-weight="600" fill="${foregroundHex}">The quick brown fox</text>
  <text x="210" y="140" font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="26" fill="${foregroundHex}">jumps over the lazy dog</text>
  <text x="48" y="228" font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="18" fill="${foregroundHex}">Small text — 1234567890 — the five boxing wizards jump quickly</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
