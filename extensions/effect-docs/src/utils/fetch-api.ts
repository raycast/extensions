import { LocalStorage } from "@raycast/api";
import type { ApiItem } from "../types";
import { parseApiRef } from "./parse-api-ref";
import { scoreSearch } from "./search";

const API_REF_URL = "https://tim-smart.github.io/effect-io-ai/";
const CACHE_KEY = "effect-api-index-v1";
const CACHE_TTL = 3600000; // 1 hour

type CachedApiItems = {
	data: ApiItem[];
	timestamp: number;
};

export async function fetchApiIndex(): Promise<ApiItem[]> {
	const cachedJson = await LocalStorage.getItem<string>(CACHE_KEY);
	if (cachedJson) {
		try {
			const cached = JSON.parse(cachedJson) as CachedApiItems;
			if (Date.now() - cached.timestamp < CACHE_TTL) return cached.data;

			void refreshApiIndex().catch(() => undefined);
			return cached.data;
		} catch {
			// Ignore malformed cache entries and refresh from the source.
		}
	}

	return refreshApiIndex();
}

async function refreshApiIndex(): Promise<ApiItem[]> {
	const response = await fetch(API_REF_URL);
	if (!response.ok) {
		throw new Error(`Failed to fetch ${API_REF_URL}: ${response.status}`);
	}

	const data = await response.text();
	const items = sortApiItems(parseApiRef(data, API_REF_URL));
	await LocalStorage.setItem(CACHE_KEY, JSON.stringify({ data: items, timestamp: Date.now() }));

	return items;
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
