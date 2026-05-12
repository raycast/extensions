import { type ApiItem } from "../types";

export function parseApiRef(content: string, baseUrl: string): ApiItem[] {
	const items: ApiItem[] = [];
	const seen = new Set<string>();
	const regex = /<a\s+href="(effect\/[^"]+)">([^<]+)<\/a>/g;
	let match;

	while ((match = regex.exec(content)) !== null) {
		const [, path, text] = match;
		const dashIdx = text.indexOf("-");
		if (dashIdx === -1) continue;

		const module = text.slice(0, dashIdx);
		const name = text.slice(dashIdx + 1);
		const key = path;

		if (seen.has(key)) continue;
		seen.add(key);

		items.push({
			module,
			name,
			url: baseUrl + path,
		});
	}

	return items;
}
