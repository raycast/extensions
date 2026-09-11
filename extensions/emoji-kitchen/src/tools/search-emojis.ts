import { loadEmojiIndex, loadEmojiVectors, getQueryVector, scoreEmojiSearchMatch } from "../utils";

type Input = {
  /** The search query to find emojis by name or keyword */
  query: string;
};

/**
 * Search for emojis by name or keyword.
 * Returns a list of matching emojis with their characters, names, and categories.
 */
export default async function tool(input: Input) {
  try {
    const query = input.query.toLowerCase().trim();
    if (query === "") {
      return {
        success: false,
        message: "Search query cannot be empty or whitespace-only. Provide a name or keyword to search for emojis.",
      };
    }

    const index = loadEmojiIndex();
    const vectors = loadEmojiVectors();

    const queryVec = getQueryVector(query);

    const results = Object.entries(index)
      .map(([unicode, info]) => ({
        ...info,
        unicode,
        score: scoreEmojiSearchMatch(info, unicode, query, queryVec, vectors),
      }))
      .filter((item) => item.score >= 0.05)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    if (results.length === 0) {
      return { success: false, message: `No emojis found for "${input.query}"` };
    }

    return {
      success: true,
      results: results.map((item) => ({
        emoji: item.e,
        name: item.a,
        category: item.c || "other",
        keywords: item.k,
      })),
      message: `Found ${results.length} emojis matching "${input.query}"`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Search failed",
    };
  }
}
