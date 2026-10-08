import { LocalStorage } from "@raycast/api";

export const ONE_HOUR_MS = 3600000;

type CacheEntry<T> = {
	data: T;
	timestamp: number;
};

export async function fetchWithCache<T>(
	url: string,
	cacheKey: string,
	cacheTtl: number,
	parse: (raw: string) => T,
): Promise<T> {
	const cached = readCache<T>(await LocalStorage.getItem<string>(cacheKey));
	if (cached) {
		if (Date.now() - cached.timestamp < cacheTtl) return cached.data;

		void refresh(url, cacheKey, parse).catch(() => undefined);
		return cached.data;
	}

	return refresh(url, cacheKey, parse);
}

function readCache<T>(raw: string | undefined): CacheEntry<T> | undefined {
	if (!raw) return undefined;

	try {
		const parsed = JSON.parse(raw) as unknown;
		if (
			parsed &&
			typeof parsed === "object" &&
			"data" in parsed &&
			"timestamp" in parsed &&
			typeof (parsed as { timestamp: unknown }).timestamp === "number"
		) {
			return parsed as CacheEntry<T>;
		}
	} catch {
		// Malformed JSON — fall through and refresh from the source.
	}

	return undefined;
}

async function refresh<T>(url: string, cacheKey: string, parse: (raw: string) => T): Promise<T> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch ${url}: ${response.status}`);
	}

	const data = parse(await response.text());
	await LocalStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));

	return data;
}
