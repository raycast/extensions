import { AI, open } from "@raycast/api";
import { createDeeplink, DeeplinkType } from "@raycast/utils";
import { getAvailableGenres, SoundrawAPIError } from "../lib/sounds/soundraw";
import packageJson from "../../package.json";

type Input = {
  /**
   * The user's search query describing what kind of music or samples they want.
   * Examples: "energetic electronic music", "jazz tracks", "rock background music", etc.
   * The tool will automatically map this to appropriate genres from the available pool.
   */
  query: string;
};

/**
 * Search for audio samples by interpreting the user's natural language query
 * and automatically matching it to appropriate genres from the available genre pool.
 * Automatically opens the search-sounds command with the matched genres pre-selected.
 */
export default async function (input: Input) {
  const { query } = input;

  try {
    // Get available genres from the API
    const genresData = await getAvailableGenres();
    const availableGenres = genresData.genres;
    const genreList = Object.keys(availableGenres);

    // Use AI to determine which genres match the user's query with structured output
    const aiPrompt = `Given the user's request: "${query}"

Analyze it and determine which genres from the available genre list best match their intent.

You must respond with a plain, comma-separated list of genres that best match the user's request and are available in the genre list.

Rules:
1. Output only genres from the available genre list: ${genreList.join(",")}. Do not use any other genres.
2. When there are genres, return only a comma-separated list of genres, e.g. "acoustic,drill".
3. When there are no genres, return an empty string e.g. "".`;

    const aiResponse = await AI.ask(aiPrompt, { creativity: "low", model: AI.Model.OpenAI_GPT4 });

    // Sanity check if the AI response is valid and only contains genres from the available genre list
    const parsedAiResponseAsGenresCsv = aiResponse
      .split(",")
      .map((g) => g.trim())
      .filter((g) => genreList.includes(g))
      .join(",");

    // Create deeplink to search-sounds command with genres
    // Pass genres as comma-separated string since Raycast deeplinks don't support arrays directly
    const deeplink = createDeeplink({
      type: DeeplinkType.Extension,
      ownerOrAuthorName: packageJson.author,
      extensionName: packageJson.name,
      command: packageJson.commands[0].name,
      arguments: {
        genres: parsedAiResponseAsGenresCsv,
      },
    });

    // Automatically open the deeplink using the open API
    await open(deeplink);

    // Wait 10 seconds before returning
    await new Promise((resolve) => setTimeout(resolve, 10000));

    return { success: true, message: parsedAiResponseAsGenresCsv };
  } catch (error) {
    if (error instanceof SoundrawAPIError) {
      throw new Error(`Soundraw API error: ${error.message}`);
    }
    throw error;
  }
}
