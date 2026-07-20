export function scoreSearch(value: string, query: string): number | undefined {
	const normalizedValue = value.toLowerCase();
	const compactValue = normalizedValue.replace(/[^a-z0-9]/g, "");
	const normalizedQuery = query.toLowerCase().replace(/\s+/g, "");

	if (!normalizedQuery) return 0;
	if (compactValue === normalizedQuery) return 0;
	if (compactValue.startsWith(normalizedQuery)) return 1;
	if (normalizedValue.includes(normalizedQuery)) return 2;
	if (compactValue.includes(normalizedQuery)) return 3;

	let queryIndex = 0;
	let gapPenalty = 0;
	for (const char of normalizedValue) {
		if (char === normalizedQuery[queryIndex]) {
			queryIndex++;
			if (queryIndex === normalizedQuery.length) return 4 + gapPenalty;
		} else if (queryIndex > 0) {
			gapPenalty++;
		}
	}

	return undefined;
}
