import { getPreferenceValues } from "@raycast/api";
import path from "path";
import { Preferences } from "../types/preferences";
import { getWallpaperFiles } from "../utils";
import { loadDescriptionCache } from "../ai-descriptions";

type Input = {
  /**
   * The mood, activity, time of day, or context for the wallpaper suggestion.
   * @example "focus and deep work", "relaxing evening", "energizing morning", "dark minimal aesthetic"
   */
  mood: string;
};

/**
 * Return pre-ranked wallpaper candidates so the AI can present 3 options for a given mood.
 * The AI will select the top 3 and explain why each fits.
 */
export default async function suggestWallpaper(input: Input) {
  const preferences = getPreferenceValues<Preferences>();
  const files = await getWallpaperFiles(preferences.wallpaperFolder);

  if (files.length === 0) {
    return { mood: input.mood, wallpapers: [], message: "No wallpapers found in the configured folder." };
  }

  // Use only cached descriptions — no nested AI calls inside a tool
  const cache = loadDescriptionCache();

  const moodLower = input.mood.toLowerCase();
  const moodWords = moodLower.split(/\s+/);

  // Score wallpapers by keyword overlap with the mood
  const scored = files
    .map((file) => {
      const desc = cache[file.path];
      const baseName = path.basename(file.name, path.extname(file.name)).replace(/[-_]/g, " ");
      const searchText = [baseName, desc?.description, desc?.tags].filter(Boolean).join(" ").toLowerCase();
      const score = moodWords.reduce((acc, word) => acc + (searchText.includes(word) ? 1 : 0), 0);
      return {
        filename: file.name,
        displayName: baseName,
        description: desc?.description ?? null,
        tags: desc?.tags ?? null,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  // Return top 5 scored candidates + 5 random others for variety
  const top = scored.slice(0, 5);
  const rest = scored.slice(5);
  const randomOthers = rest.sort(() => Math.random() - 0.5).slice(0, 5);
  const wallpapers = [...top, ...randomOthers].map(({ score: _score, ...w }) => w);

  return {
    mood: input.mood,
    wallpapers,
    instruction: `From this list, pick the 3 wallpapers that best fit the mood: "${input.mood}". Present them as a numbered list (1, 2, 3) with the display name and a one-sentence explanation of why each fits the mood. Then ask the user which one they'd like to set as their wallpaper.`,
  };
}
