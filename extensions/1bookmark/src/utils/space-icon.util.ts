// Space.image can be either an image URL or an emoji character.
// For emoji, convert to a jdecked/twemoji SVG CDN URL and pass it to the Raycast Icon prop (accepts URLs).
const TWEMOJI_VERSION = "17.0.2";
const TWEMOJI_BASE = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@${TWEMOJI_VERSION}/assets/svg`;

export function isImageUrl(v: string): boolean {
  return v.startsWith("http://") || v.startsWith("https://");
}

export function toTwemojiCodepoints(emoji: string): string | null {
  const codepoints = [...emoji].map((c) => c.codePointAt(0)!.toString(16)).filter((cp) => cp !== "fe0f");
  if (codepoints.length === 0) return null;
  return codepoints.join("-");
}

// Returns the value as-is if it is a URL, converts to a Twemoji SVG URL if emoji. Empty value → undefined.
export function resolveSpaceIconUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (isImageUrl(value)) return value;
  const code = toTwemojiCodepoints(value);
  if (!code) return undefined;
  return `${TWEMOJI_BASE}/${code}.svg`;
}

// Number of graphemes (user-perceived characters). ZWJ-joined emoji (e.g. 👨‍👩‍👧) count as 1 grapheme.
export function countGraphemes(value: string): number {
  if (!value) return 0;
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  return [...segmenter.segment(value)].length;
}

// Allows only an empty value, a valid URL, or exactly 1 grapheme (a single emoji).
// Emoji detection is the OR of 3 rules:
//   1) \p{Extended_Pictographic} — ordinary pictographic emoji (😀, 🚀, including ZWJ sequences like 👨‍👩‍👧)
//   2) Contains U+20E3 — keycap sequences (1️⃣, #️⃣, etc.). Digits/symbols are not Extended_Pictographic,
//      so this rule is needed separately.
//   3) Contains a Regional Indicator (U+1F1E6..U+1F1FF) — flag sequences (🇰🇷, etc.). They are composed of
//      two RIs, but an individual RI is not Extended_Pictographic.
export function isValidSpaceIcon(value: string): boolean {
  if (!value) return true;
  if (isImageUrl(value)) return true;
  if (countGraphemes(value) !== 1) return false;
  if (/\p{Extended_Pictographic}/u.test(value)) return true;
  if (/\u20E3/.test(value)) return true;
  if (/[\u{1F1E6}-\u{1F1FF}]/u.test(value)) return true;
  return false;
}
