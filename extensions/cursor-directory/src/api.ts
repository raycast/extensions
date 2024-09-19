import type { CursorRule, APIResponse, PopularCursorRulesResponse } from "./types";
import { API_URL, API_URL_POPULAR, ALL_CURSOR_RULES_CACHE_PATH, POPULAR_CURSOR_RULES_CACHE_PATH } from "./constants";
import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import fs from "fs/promises";
import { getTimestamp } from "./utils";

const isPopularCursorRulesResponse = (response: APIResponse): response is PopularCursorRulesResponse => {
  return "data" in response && Array.isArray(response.data) && "count" in response.data[0];
};

async function fetchFromAPI(url: string): Promise<CursorRule[]> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Raycast Extension" },
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = (await response.json()) as APIResponse;

    if (!Array.isArray(result.data)) {
      console.error("API did not return an array:", result.data);
      throw new Error("Unexpected data format from API");
    }

    if (isPopularCursorRulesResponse(result)) {
      return result.data;
    } else {
      return result.data.map((rule) => ({ ...rule, count: null }));
    }
  } catch (error) {
    console.error("Error fetching from API:", error);
    throw new Error("Failed to fetch data from API");
  }
}

export async function fetchCursorRules(popularOnly: boolean): Promise<CursorRule[]> {
  const apiUrl = popularOnly ? API_URL_POPULAR : API_URL;
  const cachePath = popularOnly ? POPULAR_CURSOR_RULES_CACHE_PATH : ALL_CURSOR_RULES_CACHE_PATH;

  try {
    const { cache_interval } = getPreferenceValues<Preferences>();
    const modified_timestamp = getTimestamp(cachePath);

    if (modified_timestamp > 0 && Date.now() - modified_timestamp < Number(cache_interval) * 1000 * 60 * 60 * 24) {
      console.debug("Using cache...");
      const data = await fs.readFile(cachePath, "utf8");
      return JSON.parse(data) as CursorRule[];
    } else {
      console.debug("No cache found or cache expired, fetching...");
      const cursorRules = await fetchFromAPI(apiUrl);
      console.debug(`Fetched ${cursorRules.length} cursor rules from API`);

      await fs.writeFile(cachePath, JSON.stringify(cursorRules, null, 2));
      console.debug("Wrote cursor rules to cache file");
      return cursorRules;
    }
  } catch (error) {
    console.error("Error in fetchCursorRules:", error);
    throw new Error("Failed to fetch cursor rules");
  }
}
