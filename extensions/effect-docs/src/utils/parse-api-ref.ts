import { type ApiItem } from "../types";

const BASE_URL = "https://tim-smart.github.io/effect-io-ai/";

export function parseApiRef(content: string): ApiItem[] {
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
		const key = `${module}.${name}`;

		if (seen.has(key)) continue;
		seen.add(key);

		items.push({
			module,
			name,
			url: BASE_URL + path,
		});
	}

	return items;
}
