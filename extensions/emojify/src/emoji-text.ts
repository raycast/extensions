export const MAX_APPENDED_EMOJIS = 3;

// Match complete flags, skin tones, keycaps, ZWJ sequences, and subdivision flags.
const emojiPattern =
  /(?:\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}[\uFE0E\uFE0F]?\p{Emoji_Modifier}?(?:\u200D\p{Extended_Pictographic}[\uFE0E\uFE0F]?\p{Emoji_Modifier}?)*(?:[\u{E0020}-\u{E007E}]+\u{E007F})?)/gu;

export function appendEmojiText(text: string, response: string) {
  const emojis = [...new Set(response.match(emojiPattern))];
  if (!emojis.length || emojis.length > MAX_APPENDED_EMOJIS || response.replace(emojiPattern, "").trim()) {
    return undefined;
  }

  const body = text.trimEnd();
  const existing = new Set<string>();
  let end = body.length;
  for (const match of Array.from(body.matchAll(emojiPattern)).reverse()) {
    if (body.slice(match.index + match[0].length, end).trim()) break;
    existing.add(match[0]);
    end = match.index;
  }

  const additions = emojis.filter((emoji) => !existing.has(emoji));
  return additions.length ? `${body} ${additions.join("")}${text.slice(body.length)}` : text;
}
