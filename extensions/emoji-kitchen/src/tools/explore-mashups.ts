import { loadEmojiIndex, loadCombinations, getGStaticUrl } from "../utils";

type Input = {
  /** The emoji character to explore mashups for, e.g. "😀" */
  emoji: string;
};

/**
 * Get all available mashup combinations for a given emoji.
 * Returns a list of emojis that can be combined with the input emoji, along with the mashup image URLs.
 */
export default async function tool(input: Input) {
  try {
    const index = loadEmojiIndex();

    const emojiEntry = Object.entries(index).find(([, info]) => info.e === input.emoji);

    if (!emojiEntry) {
      return { success: false, message: `Emoji "${input.emoji}" not found` };
    }

    const [unicode, info] = emojiEntry;
    const combs = loadCombinations(unicode);

    if (Object.keys(combs).length === 0) {
      return {
        success: false,
        baseEmoji: input.emoji,
        baseEmojiName: info.a,
        message: `No mashups available for ${input.emoji}`,
      };
    }

    const mashups = Object.entries(combs).map(([otherUnicode, comboStr]) => {
      const [date, left] = comboStr.split("/");
      const right = left === otherUnicode ? unicode : otherUnicode;
      const otherInfo = index[otherUnicode];

      return {
        emoji1: input.emoji,
        emoji2: otherInfo?.e || "\u2753",
        emoji2Name: otherInfo?.a || "unknown",
        mashupUrl: getGStaticUrl(left, right, date),
      };
    });

    return {
      success: true,
      baseEmoji: input.emoji,
      baseEmojiName: info.a,
      mashups,
      total: mashups.length,
      message: `Found ${mashups.length} mashups for ${input.emoji} (${info.a})`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to explore mashups",
    };
  }
}
