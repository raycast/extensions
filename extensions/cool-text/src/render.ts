import type { DotTextDetail } from "./dot-text";
import { DEFAULT_FONT, transformText } from "./transform";

const EMOJI_PATTERN = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3/u;
const GRAPHEMES = new Intl.Segmenter("en", { granularity: "grapheme" });
export const MAX_EMOJI_PER_RENDER = 8;

export async function renderCoolText(
  text: string,
  variant = "alphabet",
  font = DEFAULT_FONT,
  detail: DotTextDetail = "Detailed",
) {
  if (variant !== "dots" && (variant !== "ascii" || !EMOJI_PATTERN.test(text)))
    return transformText(text, variant, font);
  const blocks: { text: string; emoji: boolean }[] = [];
  let letters = "";
  let emojiCount = 0;
  const flush = () => {
    if (letters.trim()) blocks.push({ text: letters, emoji: false });
    letters = "";
  };
  for (const { segment } of GRAPHEMES.segment(text)) {
    if (EMOJI_PATTERN.test(segment)) {
      if (++emojiCount > MAX_EMOJI_PER_RENDER) {
        throw new Error(`Use up to ${MAX_EMOJI_PER_RENDER} emoji per ASCII or Unicode dot preview.`);
      }
      flush();
      blocks.push({ text: segment, emoji: true });
    } else {
      letters += segment;
    }
  }
  flush();
  const { emojiToAscii } = await import("./emoji-art");
  const output = await Promise.all(
    blocks.map(async (block) => {
      if (block.emoji) return emojiToAscii(block.text, variant);
      return variant === "dots"
        ? (await import("./dot-text")).textToDots(block.text, detail)
        : transformText(block.text, "ascii", font);
    }),
  );
  return output.join("\n\n");
}
