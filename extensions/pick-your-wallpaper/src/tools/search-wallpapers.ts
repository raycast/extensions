import { getPreferenceValues } from "@raycast/api";
import path from "path";
import { Preferences } from "../types/preferences";
import { getWallpaperFiles } from "../utils";
import { loadDescriptionCache } from "../ai-descriptions";

type Input = {
  /**
   * A natural language description of the wallpaper to search for.
   * Can describe colors, mood, subject, style, or theme.
   * @example "calm blue ocean", "dark minimal", "vibrant nature", "orange sunset"
   */
  query: string;
};

/**
 * Search the user's wallpaper collection using a natural language description.
 * Returns wallpapers with their filenames and descriptions for the AI to rank.
 */
export default async function searchWallpapers(input: Input) {
  const preferences = getPreferenceValues<Preferences>();
  const files = await getWallpaperFiles(preferences.wallpaperFolder);

  if (files.length === 0) {
    return { results: [], message: "No wallpapers found in the configured folder." };
  }

  // Use only cached descriptions — no nested AI calls inside a tool
  const cache = loadDescriptionCache();

  const queryLower = input.query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);

  const results = files.map((file) => {
    const desc = cache[file.path];
    const baseName = path.basename(file.name, path.extname(file.name)).replace(/[-_]/g, " ");
    return {
      filename: file.name,
      displayName: baseName,
      description: desc?.description ?? null,
      tags: desc?.tags ?? null,
    };
  });

  // Score by keyword overlap with filename + cached description/tags
  const scored = results
    .map((r) => {
      const searchText = [r.displayName, r.description, r.tags].filter(Boolean).join(" ").toLowerCase();
      const score = queryWords.reduce((acc, word) => acc + (searchText.includes(word) ? 1 : 0), 0);
      return { ...r, score };
    })
    .sort((a, b) => b.score - a.score);

  // Return top matches first, then the rest — AI will re-rank based on descriptions
  const top = scored.filter((r) => r.score > 0).slice(0, 15);
  const rest = scored.filter((r) => r.score === 0).slice(0, 5);

  return {
    query: input.query,
    results: top.length > 0 ? top : scored.slice(0, 15),
    hasMore: rest.length > 0,
    total: files.length,
    hasCachedDescriptions: Object.keys(cache).length > 0,
    instruction:
      "Present the top 3–5 results as a numbered list. For each, show the display name and a one-sentence description of what it looks like. After the list, ask the user which one they'd like to set as their wallpaper.",
  };
}
