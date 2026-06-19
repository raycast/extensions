import type { ApiItem } from "../types";
import { fetchWithCache, ONE_HOUR_MS } from "./fetch-with-cache";
import { parseApiRef } from "./parse-api-ref";
import { scoreSearch } from "./search";

const API_REF_URL = "https://tim-smart.github.io/effect-io-ai/";
const CACHE_KEY = "effect-api-index-v1";

export function fetchApiIndex(): Promise<ApiItem[]> {
	return fetchWithCache(API_REF_URL, CACHE_KEY, ONE_HOUR_MS, (raw) => sortApiItems(parseApiRef(raw, API_REF_URL)));
}

function sortApiItems(items: ApiItem[]): ApiItem[] {
	return [...items].sort((a, b) => {
		if (a.module === "Effect" && b.module !== "Effect") return -1;
		if (a.module !== "Effect" && b.module === "Effect") return 1;
		if (a.module !== b.module) return a.module.localeCompare(b.module);
		return a.name.localeCompare(b.name);
	});
}

export function searchApiItems(items: ApiItem[], query: string): ApiItem[] {
	if (!query.trim()) return items;
	return items
		.map((item, index) => {
			const scores = [
				scoreSearch(item.name, query),
				scoreSearch(`${item.module}.${item.name}`, query),
				scoreSearch(item.module, query),
			].filter((score): score is number => score !== undefined);

			return {
				item,
				index,
				score: scores.length > 0 ? Math.min(...scores) : undefined,
			};
		})
		.filter((result): result is { item: ApiItem; index: number; score: number } => result.score !== undefined)
		.sort((a, b) => a.score - b.score || a.index - b.index)
		.map(({ item }) => item);
}
