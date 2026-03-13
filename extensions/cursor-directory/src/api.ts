import type { CursorRule, APIResponse, PopularCursorRulesResponse } from "./types";
import {
  API_URL,
  API_URL_POPULAR,
  ALL_CURSOR_RULES_CACHE_PATH,
  POPULAR_CURSOR_RULES_CACHE_PATH,
  MAX_STARRED_RULES,
  STARRED_RULE_PREFIX,
} from "./constants";
import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import fs from "fs/promises";
import { expandPath, getLastModifiedTime, parseMarkdownToRule } from "./utils";
import { LocalStorage } from "@raycast/api";
import path from "path";

export async function getStarredRules(): Promise<string[]> {
  const allItems = await LocalStorage.allItems<string[]>();
  return Object.values(allItems);
}

export async function starRule(slug: string): Promise<void> {
  const starredRules = await getStarredRules();
  if (starredRules.length >= MAX_STARRED_RULES) {
    const oldestRule = starredRules[starredRules.length - 1];
    await LocalStorage.removeItem(`${STARRED_RULE_PREFIX}${oldestRule}`);
  }
  await LocalStorage.setItem(`${STARRED_RULE_PREFIX}${slug}`, slug);
}

export async function unstarRule(slug: string): Promise<void> {
  await LocalStorage.removeItem(`${STARRED_RULE_PREFIX}${slug}`);
}

export async function isRuleStarred(slug: string): Promise<boolean> {
  const key = `${STARRED_RULE_PREFIX}${slug}`;
  return (await LocalStorage.getItem<string>(key)) !== undefined;
}

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
    const { cacheInterval } = getPreferenceValues<Preferences>();
    const modified_timestamp = await getLastModifiedTime(cachePath);

    if (modified_timestamp > 0 && Date.now() - modified_timestamp < Number(cacheInterval) * 1000 * 60 * 60 * 24) {
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

export async function fetchLocalRules(): Promise<CursorRule[]> {
  const { exportDirectory } = getPreferenceValues<Preferences>();
  const expandedPath = expandPath(exportDirectory);

  try {
    const files = await fs.readdir(expandedPath);
    const markdownFiles = files.filter((file) => file.endsWith(".md"));

    const localRules: CursorRule[] = [];

    for (const file of markdownFiles) {
      const filePath = path.join(expandedPath, file);
      const content = await fs.readFile(filePath, "utf-8");
      const rule = parseMarkdownToRule(content, file);
      if (rule) {
        localRules.push(rule);
      }
    }

    return localRules;
  } catch (error) {
    console.error("Error fetching local rules:", error);
    return [];
  }
}
