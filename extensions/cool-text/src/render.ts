import { DEFAULT_FONT, transformText } from "./transform";

const EMOJI_PATTERN = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3/u;
const GRAPHEMES = new Intl.Segmenter("en", { granularity: "grapheme" });

export async function renderCoolText(text: string, variant = "alphabet", font = DEFAULT_FONT) {
  if (variant !== "dots" && (variant !== "ascii" || !EMOJI_PATTERN.test(text)))
    return transformText(text, variant, font);
  const { emojiToAscii } = await import("./emoji-art");
  const blocks: string[] = [];
  let letters = "";
  const flush = async () => {
    if (letters.trim()) {
      blocks.push(
        variant === "dots"
          ? await (await import("./dot-text")).textToDots(letters)
          : transformText(letters, "ascii", font),
      );
    }
    letters = "";
  };
  for (const { segment } of GRAPHEMES.segment(text)) {
    if (EMOJI_PATTERN.test(segment)) {
      await flush();
      blocks.push(await emojiToAscii(segment, variant));
    } else {
      letters += segment;
    }
  }
  await flush();
  return blocks.join("\n\n");
}
