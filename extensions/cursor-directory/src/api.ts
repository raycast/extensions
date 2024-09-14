import type { Prompt } from "./types";
import { API_URL, API_URL_POPULAR, ALL_PROMPTS_CACHE_PATH, POPULAR_PROMPTS_CACHE_PATH } from "./constants";
import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import fs from "fs/promises";
import { getTimestamp } from "./utils";

async function fetchFromAPI(url: string): Promise<Prompt[]> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Raycast Extension" },
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = (await response.json()) as { data: Prompt[] };

    const data = result.data;

    if (!Array.isArray(data)) {
      console.error("API did not return an array:", data);
      throw new Error("Unexpected data format from API");
    }

    return data as Prompt[];
  } catch (error) {
    console.error("Error fetching from API:", error);
    throw new Error("Failed to fetch data from API");
  }
}

export async function fetchPrompts(popularOnly: boolean): Promise<Prompt[]> {
  const apiUrl = popularOnly ? API_URL_POPULAR : API_URL;
  const cachePath = popularOnly ? POPULAR_PROMPTS_CACHE_PATH : ALL_PROMPTS_CACHE_PATH;

  try {
    const { cache_interval } = getPreferenceValues<Preferences>();
    const modified_timestamp = getTimestamp(cachePath);

    if (modified_timestamp > 0 && Date.now() - modified_timestamp < Number(cache_interval) * 1000 * 60 * 60 * 24) {
      console.debug("Using cache...");
      const data = await fs.readFile(cachePath, "utf8");
      return JSON.parse(data) as Prompt[];
    } else {
      console.debug("No cache found or cache expired, fetching...");
      const prompts = await fetchFromAPI(apiUrl);
      console.debug(`Fetched ${prompts.length} prompts from API`);

      await fs.writeFile(cachePath, JSON.stringify(prompts, null, 2));
      console.debug("Wrote prompts to cache file");
      return prompts;
    }
  } catch (error) {
    console.error("Error in fetchPrompts:", error);
    throw new Error("Failed to fetch prompts");
  }
}
