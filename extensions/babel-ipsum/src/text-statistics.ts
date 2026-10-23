export type TextStatistics = { characters: number; words: number };

export function textStatistics(text: string, locale = "en"): TextStatistics {
  // Unsupported or malformed locale tags fall back to English; Intl still handles Unicode graphemes.
  const supported = (() => {
    try {
      return Intl.Segmenter.supportedLocalesOf([locale])[0] ?? "en";
    } catch {
      return "en";
    }
  })();
  const wordSegmenter = new Intl.Segmenter(supported, { granularity: "word" });
  const characterSegmenter = new Intl.Segmenter(supported, { granularity: "grapheme" });
  let characters = 0;
  let words = 0;
  const graphemes = characterSegmenter.segment(text)[Symbol.iterator]();
  while (!graphemes.next().done) characters++;
  for (const segment of wordSegmenter.segment(text)) {
    if (segment.isWordLike) words++;
  }
  return { characters, words };
}
