// Presentation helpers for the enrichment sidebar.

/**
 * Render a 0–5 rating as star glyphs. Clamps to 0…5, rounds to the NEAREST HALF
 * (ties round up), then emits 5 glyph-slots: ★ full, ½ half, ☆ empty.
 * Non-finite/undefined → "No Rating". Callers only invoke this when reviewsCount > 0.
 */
export function renderStarRating(rating: number | undefined): string {
  if (rating === undefined || !Number.isFinite(rating)) return "No Rating";
  const bounded = Math.min(Math.max(rating, 0), 5);
  const halves = Math.round(bounded * 2); // nearest half, ties up (Math.round rounds .5 up)
  const full = Math.floor(halves / 2);
  const half = halves % 2 === 1;
  const empty = 5 - full - (half ? 1 : 0);
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(empty);
}

/**
 * Compact follower/count formatting: 950→"950", 1000→"1K", 1500→"1.5K",
 * 473000→"473K", 999999→"1M", 1000000→"1M", 1500000→"1.5M". undefined→"".
 */
export function formatCompactCount(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return "";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
