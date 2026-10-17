import type { SongLink } from "../lib/types";
import { convertMusicLink } from "../lib/api";

type Input = {
  /**
   * The music URL to convert to other providers.
   * Must be a valid music link from a supported provider (e.g., Spotify, Apple Music, YouTube Music, etc.).
   * Examples: "https://open.spotify.com/track/...", "https://music.apple.com/...", "https://music.youtube.com/..."
   */
  url: string;
  /**
   * Array of provider names to filter results. **MUST extract from user prompt when they mention specific providers.**
   *
   * When user mentions providers like "to Spotify and Apple Music", "for Deezer", "convert to YouTube Music",
   * you MUST extract those provider names and include them in this array.
   *
   * When user says "to other providers" or doesn't mention any specific providers, pass an empty array [].
   *
   * Provider names: "Spotify", "Apple Music", "YouTube Music", "Deezer", "Tidal", "SoundCloud", "Anghami",
   * "Amazon Music", "YouTube", "iTunes", "Yandex Music", "Amazon Store".
   * Also accepts keys: "spotify", "appleMusic", "youtubeMusic", "deezer", "tidal", "soundcloud", etc.
   * Matching is case-insensitive.
   *
   * Extraction examples:
   * - User: "convert to Spotify and Apple Music" → providers: ["Spotify", "Apple Music"]
   * - User: "to YouTube Music" → providers: ["YouTube Music"]
   * - User: "for Deezer and Tidal" → providers: ["Deezer", "Tidal"]
   * - User: "convert to spotify, deezer, and tidal" → providers: ["spotify", "deezer", "tidal"]
   * - User: "to other providers" or no providers mentioned → providers: []
   */
  providers: string[];
};

/**
 * Confirmation function to show what URL will be converted before executing.
 *
 * - If providers are specified, they will be shown in the confirmation.
 * - If not, user is reminded that links for all enabled providers will be returned.
 */
export const confirmation = async (input: Input) => {
  const info = [
    {
      name: "URL",
      value: input.url,
    },
  ];

  if (input.providers.length > 0) {
    info.push({
      name: "Providers",
      value: input.providers.join(", "),
    });
  } else {
    info.push({
      name: "Providers",
      value: "All enabled providers (no specific filter detected)",
    });
  }

  return {
    message: `Convert music link${input.providers.length > 0 ? ` to ${input.providers.join(", ")}` : " to other providers"}?`,
    info,
  };
};

/**
 * **CRITICAL INSTRUCTION: ALWAYS extract provider names when user mentions them in their prompt!**
 *
 * Main tool function to convert a music link to other provider links.
 *
 * **EXTRACTION RULE: If user mentions providers, you MUST extract them into the providers array.**
 *
 * Examples of when to extract:
 * - User: "convert to Spotify and Apple Music" → MUST call with providers: ["Spotify", "Apple Music"]
 * - User: "to YouTube Music" → MUST call with providers: ["YouTube Music"]
 * - User: "for Deezer and Tidal" → MUST call with providers: ["Deezer", "Tidal"]
 * - User: "convert this link to spotify, deezer, and tidal" → MUST call with providers: ["spotify", "deezer", "tidal"]
 *
 * Only omit providers parameter if:
 * - User says "to other providers" or "to all providers"
 * - User doesn't mention any specific provider names
 *
 * If the user requests specific providers, ONLY return links for those providers (do not ignore their request).
 * If uncertain what providers are supported, use the Search Providers command for a full list.
 *
 * @param input Object containing the music URL and providers array (extract providers from user prompt!)
 * @returns Array of converted song links for the requested or enabled providers
 */
export default async function tool(input: Input): Promise<SongLink[]> {
  const { url, providers } = input;
  // If providers array is empty, pass undefined to get all enabled providers
  // Otherwise, pass the providers array to filter results
  return await convertMusicLink(url, providers.length > 0 ? providers : undefined);
}
