// Row icons: the sender's avatar, ringed in the receiving account's color when
// Spark color-codes accounts.
//
// No Raycast imports here: this file runs under `node --test` as-is.

const SIZE = 64;
const CENTER = SIZE / 2;
// The account ring runs along the avatar's edge, with a gap before the photo.
const RING_WIDTH = 4;
const RING_GAP = 3;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

// Soft, readable backgrounds for initials, picked by a stable hash of the name.
const COLORS = ["#E5484D", "#F76B15", "#FFB224", "#30A46C", "#12A594", "#0090FF", "#3E63DD", "#8E4EC6", "#D6409F"];

export interface AvatarOptions {
  /// Base64 PNG of the sender's photo; initials are drawn without one.
  photo?: string;
  /// Name (or address) the initials and color come from.
  name: string;
  /// Account color ("#RRGGBB") for the ring; no ring without one.
  ring?: string;
}

export function initials(name: string): string {
  // For a bare address, only the part before "@" names the person.
  const source = /^[^\s@]+@[^\s@]+$/.test(name.trim()) ? name.trim().split("@")[0] : name;
  const words = source
    .replace(/<.*?>|\(.*?\)|["']/g, " ")
    .split(/[\s@._-]+/)
    .filter((word) => /\p{L}|\p{N}/u.test(word));
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words.slice(0, 1);
  return letters
    .map((word) => [...word].find((char) => /\p{L}|\p{N}/u.test(char)) ?? "")
    .join("")
    .toUpperCase();
}

function colorFor(name: string): string {
  let hash = 0;
  for (const char of name.toLowerCase()) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return COLORS[hash % COLORS.length];
}

export function escapeXML(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

export const FONT = "-apple-system, BlinkMacSystemFont, Helvetica Neue, Arial, sans-serif";

export function toDataURI(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/// A round avatar at (cx, cy): the photo clipped to a circle, or initials.
function avatarShape(
  cx: number,
  cy: number,
  radius: number,
  photo: string | undefined,
  name: string,
  mime = "image/png",
): string {
  if (photo) {
    // A photo used as Spark cached it may be a JPEG ("/9j/" is its base64 start).
    if (photo.startsWith("/9j/")) mime = "image/jpeg";
    return (
      `<clipPath id="c"><circle cx="${cx}" cy="${cy}" r="${radius}"/></clipPath>` +
      `<image href="data:${mime};base64,${photo}" x="${cx - radius}" y="${cy - radius}" width="${radius * 2}" height="${radius * 2}" clip-path="url(#c)" preserveAspectRatio="xMidYMid slice"/>`
    );
  }
  const text = initials(name) || "?";
  const fontSize = Math.round(radius * (text.length > 1 ? 0.8 : 0.95));
  return (
    `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${colorFor(name)}"/>` +
    `<text x="${cx}" y="${cy}" dy="0.35em" text-anchor="middle" font-family="${FONT}" font-size="${fontSize}" font-weight="600" fill="#FFFFFF">${escapeXML(text)}</text>`
  );
}

/// An SVG data URI for a list row's icon.
export function avatarSVG({ photo, name, ring }: AvatarOptions): string {
  // Only a strict #RRGGBB reaches the markup.
  const ringColor = ring && HEX_COLOR.test(ring) ? ring : undefined;
  const radius = ringColor ? CENTER - RING_WIDTH - RING_GAP : CENTER;
  const ringShape = ringColor
    ? `<circle cx="${CENTER}" cy="${CENTER}" r="${CENTER - RING_WIDTH / 2}" fill="none" stroke="${ringColor}" stroke-width="${RING_WIDTH}"/>`
    : "";
  return toDataURI(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">` +
      `${ringShape}${avatarShape(CENTER, CENTER, radius, photo, name)}</svg>`,
  );
}

// MARK: - Message header

const HEADER_HEIGHT = 32;
const HEADER_AVATAR = 28;
const HEADER_GAP = 10;
const HEADER_FONT_SIZE = 15;
/// Wider than any detail pane is too wide: Raycast would shrink the image.
export const HEADER_MAX_WIDTH = 640;

/// An estimate of `text`'s width at `fontSize`, erring wide - the image's
/// right edge is transparent, so extra room costs nothing, while too little
/// would clip the text.
export function textWidth(text: string, fontSize: number, bold = false): number {
  let em = 0;
  for (const char of text) {
    if (/[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60]/.test(char)) em += 1;
    else if (/[\p{Extended_Pictographic}]/u.test(char)) em += 1.2;
    else if (/[mwMW@]/.test(char)) em += 0.85;
    else if (/[A-Z\p{Lu}]/u.test(char)) em += 0.68;
    else if (/[ilj.,:;'|!]/.test(char)) em += 0.3;
    else if (char === " ") em += 0.28;
    else em += 0.56;
  }
  return Math.ceil(em * fontSize * (bold ? 1.06 : 1));
}

function fit(text: string, maxWidth: number, fontSize: number, bold: boolean): string {
  if (textWidth(text, fontSize, bold) <= maxWidth) return text;
  const chars = [...text];
  while (chars.length && textWidth(`${chars.join("")}…`, fontSize, bold) > maxWidth) chars.pop();
  return chars.length ? `${chars.join("").trimEnd()}…` : "";
}

export interface HeaderOptions {
  photo?: string;
  /// Sender name, drawn bold.
  name: string;
  /// "to Alex Rivera · 24 Sep, 4:42 PM", drawn dimmer.
  detail: string;
  dark: boolean;
}

/// One message's header - avatar, name, recipients and date - as a single
/// image. Raycast's markdown sets an inline image on the text baseline with no
/// way to center it, so the whole row is drawn to line up like Spark's.
export function headerSVG({ photo, name, detail, dark }: HeaderOptions): {
  uri: string;
  width: number;
  height: number;
} {
  const textX = HEADER_AVATAR + HEADER_GAP;
  const budget = HEADER_MAX_WIDTH - textX;
  const shownName = fit(name, budget * 0.6, HEADER_FONT_SIZE, true);
  const nameWidth = textWidth(shownName, HEADER_FONT_SIZE, true);
  const shownDetail = fit(detail, budget - nameWidth - 6, HEADER_FONT_SIZE, false);
  const width = Math.min(HEADER_MAX_WIDTH, textX + nameWidth + 6 + textWidth(shownDetail, HEADER_FONT_SIZE) + 4);
  const cy = HEADER_HEIGHT / 2;
  const primary = dark ? "#FFFFFF" : "#1D1D1F";
  const secondary = dark ? "#A1A1A6" : "#6E6E73";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${HEADER_HEIGHT}" viewBox="0 0 ${width} ${HEADER_HEIGHT}">` +
    avatarShape(HEADER_AVATAR / 2, cy, HEADER_AVATAR / 2, photo, name) +
    `<text x="${textX}" y="${cy}" dy="0.35em" font-family="${FONT}" font-size="${HEADER_FONT_SIZE}">` +
    `<tspan font-weight="600" fill="${primary}">${escapeXML(shownName)}</tspan>` +
    (shownDetail ? `<tspan dx="6" fill="${secondary}">${escapeXML(shownDetail)}</tspan>` : "") +
    `</text></svg>`;
  return { uri: toDataURI(svg), width, height: HEADER_HEIGHT };
}

// MARK: - Contact card

// The card is at least this wide, and widens for long details up to the max -
// the details are centered on the middle, so each value has half the width.
const CARD_MIN_WIDTH = 420;
const CARD_MAX_WIDTH = 700;
const CARD_AVATAR = 96;
const CARD_NAME_SIZE = 22;
const CARD_EMAIL_SIZE = 14;
const CARD_DETAIL_SIZE = 14;
const CARD_ROW_HEIGHT = 26;
const CARD_DETAILS_GAP = 30;

export interface CardOptions {
  /// Base64 image of the contact's photo, and its MIME type.
  photo?: string;
  photoType?: string;
  name: string;
  email: string;
  dark: boolean;
  /// Label and value rows, centered under the address: labels right-aligned
  /// and values left-aligned against the center line.
  details?: [string, string][];
}

/// A contact page: a large avatar with the name, address, and details
/// centered under it. Markdown can't center text, but it centers an image
/// that stands alone on its line, so the card is one image.
export function contactCardSVG({ photo, photoType, name, email, dark, details = [] }: CardOptions): {
  uri: string;
  width: number;
  height: number;
} {
  const longest = Math.max(
    0,
    ...details.flatMap(([label, value]) => [textWidth(label, CARD_DETAIL_SIZE), textWidth(value, CARD_DETAIL_SIZE)]),
  );
  const width = Math.min(CARD_MAX_WIDTH, Math.max(CARD_MIN_WIDTH, 2 * (longest + 18)));
  const cx = width / 2;
  const radius = CARD_AVATAR / 2;
  const nameY = CARD_AVATAR + 34;
  const emailY = nameY + 24;
  const detailsTop = emailY + CARD_DETAILS_GAP;
  const height = details.length ? detailsTop + (details.length - 1) * CARD_ROW_HEIGHT + 10 : emailY + 12;
  const shownName = fit(name, width - 20, CARD_NAME_SIZE, true);
  const shownEmail = name === email ? "" : fit(email, width - 20, CARD_EMAIL_SIZE, false);
  const primary = dark ? "#FFFFFF" : "#1D1D1F";
  const secondary = dark ? "#A1A1A6" : "#6E6E73";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    avatarShape(cx, radius, radius, photo, name, photoType) +
    `<text x="${cx}" y="${nameY}" text-anchor="middle" font-family="${FONT}" font-size="${CARD_NAME_SIZE}" font-weight="600" fill="${primary}">${escapeXML(shownName)}</text>` +
    (shownEmail
      ? `<text x="${cx}" y="${emailY}" text-anchor="middle" font-family="${FONT}" font-size="${CARD_EMAIL_SIZE}" fill="${secondary}">${escapeXML(shownEmail)}</text>`
      : "") +
    details
      .map(([label, value], row) => {
        const y = detailsTop + row * CARD_ROW_HEIGHT;
        const half = cx - 10;
        return (
          `<text x="${cx - 8}" y="${y}" text-anchor="end" font-family="${FONT}" font-size="${CARD_DETAIL_SIZE}" fill="${secondary}">${escapeXML(fit(label, half, CARD_DETAIL_SIZE, false))}</text>` +
          `<text x="${cx + 8}" y="${y}" font-family="${FONT}" font-size="${CARD_DETAIL_SIZE}" fill="${primary}">${escapeXML(fit(value, half, CARD_DETAIL_SIZE, false))}</text>`
        );
      })
      .join("") +
    `</svg>`;
  return { uri: toDataURI(svg), width, height };
}
