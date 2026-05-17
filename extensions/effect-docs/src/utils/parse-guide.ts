import { type DocItem } from "../types";

export function parseLlmsTxt(content: string): DocItem[] {
	const items: DocItem[] = [];
	const lines = content.split("\n");
	let currentSection: string | undefined;

	for (const line of lines) {
		const trimmed = line.trim();

		if (trimmed.startsWith("## ")) {
			currentSection = trimmed.replace(/^## /, "");
			continue;
		}

		const match = trimmed.match(/^-\s+\[(.+?)\]\((.+?)\):\s*(.*)$/);
		if (match)
			items.push({
				title: match[1],
				url: match[2],
				description: match[3],
				section: currentSection,
			});
	}

	return items;
}
