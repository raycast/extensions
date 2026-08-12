import { type DocItem } from "../types";

const BASE_URL = "https://effect.website";
const DOCS_PATH_RE = /^\/docs\/.+/;

const SIDEBAR_OPEN_RE = /<nav[^>]*\baria-label="Main"[^>]*>/;
const NAV_TAG_RE = /<(\/?)nav\b[^>]*>/g;

const SECTION_OR_LINK_RE = new RegExp(
	[
		String.raw`<span class="[^"]*\blarge\b[^"]*">([^<]+)<\/span>`,
		String.raw`<a\s([^>]+?)>\s*<span[^>]*>([^<]+)<\/span>\s*<\/a>`,
	].join("|"),
	"g",
);

const ATTR_RE = /([a-zA-Z][\w:-]*)="([^"]*)"/g;

export function parseDocsSidebar(html: string): DocItem[] {
	const sidebar = extractSidebar(html);
	if (sidebar === undefined) throw new Error("Could not locate the docs sidebar in the fetched HTML");

	const items: DocItem[] = [];
	const seen = new Set<string>();
	let section: string | undefined;

	for (const match of sidebar.matchAll(SECTION_OR_LINK_RE)) {
		const [, sectionLabel, anchorAttrs, title] = match;

		if (sectionLabel) {
			section = decodeEntities(sectionLabel.trim());
			continue;
		}

		if (!anchorAttrs) continue;

		const attrs = parseAttributes(anchorAttrs);
		const href = attrs.href;
		if (!href || !DOCS_PATH_RE.test(href) || seen.has(href)) continue;
		seen.add(href);

		const isTopLevelLink = /\blarge\b/.test(attrs.class ?? "");

		items.push({
			title: decodeEntities(title.trim()),
			url: `${BASE_URL}${href}`,
			section: isTopLevelLink ? undefined : section,
		});
	}

	if (items.length === 0) {
		throw new Error("Located the docs sidebar but extracted no guide entries");
	}

	return items;
}

function extractSidebar(html: string): string | undefined {
	const open = SIDEBAR_OPEN_RE.exec(html);
	if (!open) return undefined;

	const contentStart = open.index + open[0].length;
	NAV_TAG_RE.lastIndex = contentStart;

	let depth = 1;
	let tag: RegExpExecArray | null;
	while ((tag = NAV_TAG_RE.exec(html)) !== null) {
		depth += tag[1] === "/" ? -1 : 1;
		if (depth === 0) return html.slice(contentStart, tag.index);
	}

	return undefined;
}

function parseAttributes(opening: string): Record<string, string> {
	const attrs: Record<string, string> = {};
	for (const match of opening.matchAll(ATTR_RE)) {
		attrs[match[1]] = match[2];
	}
	return attrs;
}

const NAMED_ENTITIES: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " ",
};

function decodeEntities(value: string): string {
	return value.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (full, body: string) => {
		if (body[0] === "#") {
			const codePoint = body[1] === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
			return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : full;
		}
		return NAMED_ENTITIES[body] ?? full;
	});
}
