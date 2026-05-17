import { LocalStorage } from "@raycast/api";

type CachedText = {
	data: string;
	timestamp: number;
};

export async function fetchTextWithCache(url: string, cacheKey: string, cacheTtl: number): Promise<string> {
	const cachedJson = await LocalStorage.getItem<string>(cacheKey);
	if (cachedJson) {
		try {
			const cached = JSON.parse(cachedJson) as CachedText;
			if (Date.now() - cached.timestamp < cacheTtl) return cached.data;

			void refreshCachedText(url, cacheKey).catch(() => undefined);
			return cached.data;
		} catch {
			// Ignore malformed cache entries and refresh from the source.
		}
	}

	return refreshCachedText(url, cacheKey);
}

async function refreshCachedText(url: string, cacheKey: string): Promise<string> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch ${url}: ${response.status}`);
	}

	const data = await response.text();
	await LocalStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));

	return data;
}
