import type { DocItem } from "../types";
import { fetchTextWithCache } from "./fetch-with-cache";
import { parseLlmsTxt } from "./parse-guide";
import { scoreSearch } from "./search";

const LLMS_TXT_URL = "https://effect.website/llms.txt";
const CACHE_KEY = "effect-llms-v2";
const CACHE_TTL = 3600000; // 1 hour

export async function fetchGuideIndex(): Promise<DocItem[]> {
	const data = await fetchTextWithCache(LLMS_TXT_URL, CACHE_KEY, CACHE_TTL);
	return parseLlmsTxt(data);
}

export function searchGuideItems(items: DocItem[], query: string): DocItem[] {
	if (!query.trim()) return items;
	return items
		.map((item, index) => ({
			item,
			index,
			score: scoreSearch(item.title, query),
		}))
		.filter((result): result is { item: DocItem; index: number; score: number } => result.score !== undefined)
		.sort((a, b) => a.score - b.score || a.index - b.index)
		.map(({ item }) => item);
}
