import type { DocItem } from "../types";
import { fetchWithCache, ONE_HOUR_MS } from "./fetch-with-cache";
import { parseDocsSidebar } from "./parse-guide";
import { scoreSearch } from "./search";

const DOCS_INDEX_URL = "https://effect.website/docs/getting-started/introduction/";
const CACHE_KEY = "effect-docs-sidebar-v2";

export function fetchGuideIndex(): Promise<DocItem[]> {
	return fetchWithCache(DOCS_INDEX_URL, CACHE_KEY, ONE_HOUR_MS, parseDocsSidebar);
}

export function searchGuideItems(items: DocItem[], query: string): DocItem[] {
	if (!query.trim()) return items;
	return items
		.map((item, index) => {
			const scores = [
				scoreSearch(item.title, query),
				item.description ? scoreSearch(item.description, query) : undefined,
				item.section ? scoreSearch(item.section, query) : undefined,
			].filter((score): score is number => score !== undefined);

			return {
				item,
				index,
				score: scores.length > 0 ? Math.min(...scores) : undefined,
			};
		})
		.filter((result): result is { item: DocItem; index: number; score: number } => result.score !== undefined)
		.sort((a, b) => a.score - b.score || a.index - b.index)
		.map(({ item }) => item);
}
