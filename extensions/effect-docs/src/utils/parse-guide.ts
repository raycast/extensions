import { type DocItem } from "../types";

const BASE_URL = "https://effect.website";

const SIDEBAR_RE = /<nav class="sidebar[^"]*"[^>]*aria-label="Main"[^>]*>([\s\S]*?)<\/nav>/;

const SECTION_OR_LINK_RE = new RegExp(
	[
		String.raw`<span class="large[^"]*">([^<]+)<\/span>`,
		String.raw`<a\s+href="(\/docs\/[^"]+)"[^>]*?class="([^"]*)"[^>]*>\s*<span[^>]*>([^<]+)<\/span>`,
	].join("|"),
	"g",
);

export function parseDocsSidebar(html: string): DocItem[] {
	const sidebar = html.match(SIDEBAR_RE)?.[1];
	if (!sidebar) throw new Error("Could not locate the docs sidebar in the fetched HTML");

	const items: DocItem[] = [];
	const seen = new Set<string>();
	let section: string | undefined;

	for (const match of sidebar.matchAll(SECTION_OR_LINK_RE)) {
		const [, sectionLabel, href, anchorClass, title] = match;

		if (sectionLabel) {
			section = decodeEntities(sectionLabel.trim());
			continue;
		}

		if (!href || seen.has(href)) continue;
		seen.add(href);

		const isTopLevelLink = /\blarge\b/.test(anchorClass ?? "");

		items.push({
			title: decodeEntities(title.trim()),
			url: `${BASE_URL}${href}`,
			section: isTopLevelLink ? undefined : section,
		});
	}

	return items;
}

const ENTITIES: Record<string, string> = {
	"&amp;": "&",
	"&lt;": "<",
	"&gt;": ">",
	"&quot;": '"',
	"&#39;": "'",
};

function decodeEntities(value: string): string {
	return value.replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity] ?? entity);
}
