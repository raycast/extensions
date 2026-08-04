// Space.image는 이미지 URL이거나 이모지 문자일 수 있다.
// 이모지인 경우 jdecked/twemoji SVG CDN URL로 변환해 Raycast Icon prop(URL 수용)에 전달한다.
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

// 값이 URL이면 그대로, 이모지면 Twemoji SVG URL로 변환. 빈 값이면 undefined.
export function resolveSpaceIconUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (isImageUrl(value)) return value;
  const code = toTwemojiCodepoints(value);
  if (!code) return undefined;
  return `${TWEMOJI_BASE}/${code}.svg`;
}

// grapheme(사용자가 인식하는 문자) 수. ZWJ 결합 이모지(👨‍👩‍👧 등)는 1 grapheme.
export function countGraphemes(value: string): number {
  if (!value) return 0;
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  return [...segmenter.segment(value)].length;
}

// 빈값, 올바른 URL, 또는 grapheme 1개(단일 이모지)만 허용.
// 이모지 여부는 3개 규칙의 OR로 판별:
//   1) \p{Extended_Pictographic} — 일반 그림 이모지 (😀, 🚀, 👨‍👩‍👧 등 ZWJ 포함)
//   2) U+20E3 포함 — 키캡 시퀀스 (1️⃣, #️⃣ 등). 숫자/기호는 Extended_Pictographic이 아니라서
//      이 규칙이 따로 필요하다.
//   3) Regional Indicator (U+1F1E6..U+1F1FF) 포함 — 국기 시퀀스 (🇰🇷 등). 두 개의 RI로
//      조합되지만 개별 RI는 Extended_Pictographic이 아니다.
export function isValidSpaceIcon(value: string): boolean {
  if (!value) return true;
  if (isImageUrl(value)) return true;
  if (countGraphemes(value) !== 1) return false;
  if (/\p{Extended_Pictographic}/u.test(value)) return true;
  if (/\u20E3/.test(value)) return true;
  if (/[\u{1F1E6}-\u{1F1FF}]/u.test(value)) return true;
  return false;
}
