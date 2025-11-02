import { AI, open } from "@raycast/api";
import { createDeeplink, DeeplinkType } from "@raycast/utils";
import { getAvailableGenres, SoundrawAPIError } from "../lib/sounds/soundraw";

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
    const genreNames = Object.values(availableGenres);

    // Use AI to determine which genres match the user's query with structured output
    const aiPrompt = `Given the user's request: "${query}"

Available genres: ${genreNames.join(", ")}

Analyze the user's request and determine which genres from the available list best match their intent.

You must respond with valid JSON only, following this exact schema:
{
  "genres": string[]  // Array of genre keys (not display names) that match the user's request
}

Rules:
- Return ONLY valid JSON, no other text
- Use genre keys from the available list: ${JSON.stringify(genreList)}
- If no genres match clearly, return {"genres": []}
- The response must be valid JSON that can be parsed directly

Available genre keys: ${JSON.stringify(genreList)}`;

    const aiResponse = await AI.ask(aiPrompt, {
      creativity: "low", // Use low creativity for more consistent genre matching
      model: AI.Model.OpenAI_GPT4,
    });

    // Parse AI response as structured JSON
    let selectedGenres: string[] = [];
    try {
      // Try to parse the response as JSON directly
      const cleanResponse = aiResponse.trim();
      // Remove markdown code blocks if present
      const jsonMatch = cleanResponse.match(/```json\s*(\{.*?\})\s*```/s) || cleanResponse.match(/(\{.*?\})/s);
      const jsonString = jsonMatch ? jsonMatch[1] : cleanResponse;
      const parsed = JSON.parse(jsonString);

      if (parsed && Array.isArray(parsed.genres)) {
        selectedGenres = parsed.genres;
      } else if (Array.isArray(parsed)) {
        // Fallback: if it's just an array, use it directly
        selectedGenres = parsed;
      }
    } catch {
      // If structured parsing fails, try to match genre keys from the response
      selectedGenres = genreList.filter(
        (key) =>
          aiResponse.toLowerCase().includes(key.toLowerCase()) ||
          aiResponse.toLowerCase().includes(availableGenres[key].toLowerCase()),
      );
    }

    // Validate genres are actually available
    selectedGenres = selectedGenres.filter((key) => genreList.includes(key));

    // Create deeplink to search-sounds command with genres
    // Pass genres as comma-separated string since Raycast deeplinks don't support arrays directly
    const deeplink = createDeeplink({
      type: DeeplinkType.Extension,
      ownerOrAuthorName: "clins1994",
      extensionName: "sound-search",
      command: "search-sounds",
      arguments: {
        genres: selectedGenres.length > 0 ? selectedGenres.join(",") : "",
      },
    });

    // Automatically open the deeplink using the open API
    await open(deeplink);

    // Wait 10 seconds before returning
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Return genre information
    const genreDisplayNames = selectedGenres.map((key) => availableGenres[key]);

    return {
      success: true,
      genres: genreDisplayNames,
      genresCount: selectedGenres.length,
      message:
        selectedGenres.length > 0
          ? `Found ${selectedGenres.length} matching genre${selectedGenres.length > 1 ? "s" : ""}: ${genreDisplayNames.join(", ")}. Opening search results...`
          : "No matching genres found. Opening search command to manually select genres...",
    };
  } catch (error) {
    if (error instanceof SoundrawAPIError) {
      throw new Error(`Soundraw API error: ${error.message}`);
    }
    throw error;
  }
}
