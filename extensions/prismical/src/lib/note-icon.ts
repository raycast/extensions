/** Only literal emoji may become image sources; never fetch note-controlled URLs. */
export function noteEmoji(value?: string | null): string | undefined {
  if (!value || value.length > 32) return undefined;
  const graphemes = [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(value)];
  return graphemes.length === 1 && /\p{Extended_Pictographic}|\p{Regional_Indicator}|[0-9#*]\uFE0F?\u20E3/u.test(value)
    ? value
    : undefined;
}
