import { loadEmojiIndex, loadCombinations, getGStaticUrl } from "../utils";

type Input = {
  /** The first emoji character, e.g. "😀" */
  emoji1: string;
  /** The second emoji character, e.g. "🔥" */
  emoji2: string;
};

/**
 * Combine two emojis into a Google Emoji Kitchen mashup.
 * Returns the mashup image URL if the combination exists.
 */
export default async function tool(input: Input) {
  try {
    const index = loadEmojiIndex();

    const emoji1Entry = Object.entries(index).find(([, info]) => info.e === input.emoji1);
    const emoji2Entry = Object.entries(index).find(([, info]) => info.e === input.emoji2);

    if (!emoji1Entry) {
      return { success: false, message: `Emoji "${input.emoji1}" not found` };
    }

    if (!emoji2Entry) {
      return { success: false, message: `Emoji "${input.emoji2}" not found` };
    }

    const [emoji1Unicode] = emoji1Entry;
    const [emoji2Unicode] = emoji2Entry;
    const emoji1Name = emoji1Entry[1].a;
    const emoji2Name = emoji2Entry[1].a;

    const combs = loadCombinations(emoji1Unicode);
    const comboStr = combs[emoji2Unicode];

    if (!comboStr) {
      return {
        success: false,
        emoji1: input.emoji1,
        emoji2: input.emoji2,
        emoji1Name,
        emoji2Name,
        message: `No mashup exists for ${input.emoji1} + ${input.emoji2}`,
      };
    }

    const [date, left] = comboStr.split("/");
    const right = left === emoji2Unicode ? emoji1Unicode : emoji2Unicode;
    const url = getGStaticUrl(left, right, date);

    return {
      success: true,
      emoji1: input.emoji1,
      emoji2: input.emoji2,
      emoji1Name,
      emoji2Name,
      mashupUrl: url,
      message: `Mashup created: ${input.emoji1} + ${input.emoji2}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to combine emojis",
    };
  }
}
