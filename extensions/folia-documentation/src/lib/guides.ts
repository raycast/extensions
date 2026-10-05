import { environment } from "@raycast/api";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "node-html-parser";
import { CACHE_SCHEMA, GUIDES_BASE } from "./constants";
import { fetchPage } from "./pages";
import { DocEntry } from "./types";

const GUIDE_TTL = 24 * 60 * 60 * 1000;

// PaperMC's Folia guide site has a small, stable set of pages, so a static
// list is simpler and safer than crawling the sitemap on every launch.
interface GuidePage {
  page: string;
  group: string;
  title: string;
}

const GUIDE_PAGES: GuidePage[] = [
  { page: "", group: "Folia", title: "Introduction" },
  { page: "admin/", group: "Administration", title: "Administration" },
  {
    page: "admin/reference/",
    group: "Administration",
    title: "Reference",
  },
  { page: "faq/", group: "FAQ", title: "Frequently Asked Questions" },
  {
    page: "reference/overview/",
    group: "API Reference",
    title: "Overview",
  },
  {
    page: "reference/region-logic/",
    group: "API Reference",
    title: "Region Logic",
  },
];

export const FAQ_PAGE = "faq/";

interface GuideSection {
  page: string;
  group: string;
  anchor: string;
  title: string;
  html: string;
}

interface StoredGuides {
  fetchedAt: number;
  sections: GuideSection[];
}

let cached: StoredGuides | null = null;

function guidesFile(): string {
  return path.join(environment.supportPath, `guides-${CACHE_SCHEMA}.json`);
}

interface RuleNode {
  nodeType: number;
  tagName?: string;
  id?: string;
  text: string;
  outerHTML: string;
  querySelector(selector: string): RuleNode | null;
}

function asRuleNode(node: unknown): RuleNode {
  return node as RuleNode;
}

// A Starlight page renders each heading as an <h2> nested inside a wrapper
// div, so the page is split at the wrapper level rather than at the heading
// itself and the intro before the first heading becomes its own "_top" entry.
function splitSections(page: GuidePage, contentHtml: string): GuideSection[] {
  const root = parse(contentHtml);
  const sections: GuideSection[] = [];

  let anchor = "_top";
  let title = page.title;
  let buffer: string[] = [];

  function flush(): void {
    const html = buffer.join("").trim();
    if (html)
      sections.push({
        page: page.page,
        group: page.group,
        anchor,
        title,
        html,
      });
    buffer = [];
  }

  for (const child of root.childNodes) {
    const node = asRuleNode(child);
    const heading = node.tagName === "H2" ? node : node.querySelector?.("h2");
    if (heading?.id) {
      flush();
      anchor = heading.id;
      title = heading.text.trim();
      continue;
    }
    if (node.outerHTML) buffer.push(node.outerHTML);
  }
  flush();

  return sections;
}

function extractContent(html: string): string | null {
  const marker = 'class="sl-markdown-content"';
  const start = html.indexOf(marker);
  if (start === -1) return null;

  const divStart = html.lastIndexOf("<div", start);
  if (divStart === -1) return null;

  const open = /<div[\s>]/g;
  const close = /<\/div>/g;
  open.lastIndex = divStart + 1;
  close.lastIndex = divStart + 1;

  let depth = 1;
  let contentEnd = html.length;
  while (depth > 0) {
    const closing = close.exec(html);
    if (!closing) break;
    let opening = open.exec(html);
    while (opening && opening.index < closing.index) {
      depth++;
      opening = open.exec(html);
    }
    if (opening) open.lastIndex = opening.index;
    depth--;
    if (depth === 0) contentEnd = closing.index;
  }

  const bodyStart = html.indexOf(">", start) + 1;
  return html.slice(bodyStart, contentEnd);
}

async function download(): Promise<StoredGuides> {
  const sections: GuideSection[] = [];

  for (const page of GUIDE_PAGES) {
    const html = await fetchPage(page.page, GUIDES_BASE);
    const content = extractContent(html);
    if (content) sections.push(...splitSections(page, content));
  }

  const stored: StoredGuides = { fetchedAt: Date.now(), sections };
  await mkdir(environment.supportPath, { recursive: true });
  await writeFile(guidesFile(), JSON.stringify(stored), "utf8");
  return stored;
}

async function readStored(): Promise<StoredGuides | null> {
  try {
    const stored = JSON.parse(
      await readFile(guidesFile(), "utf8"),
    ) as StoredGuides;
    return stored.sections?.length ? stored : null;
  } catch {
    return null;
  }
}

async function ensureGuides(force = false): Promise<StoredGuides> {
  if (cached && !force && Date.now() - cached.fetchedAt < GUIDE_TTL)
    return cached;

  const stored = force ? null : await readStored();
  if (stored && Date.now() - stored.fetchedAt < GUIDE_TTL) {
    cached = stored;
    return stored;
  }

  try {
    cached = await download();
  } catch (error) {
    const stale = stored ?? (await readStored());
    if (!stale) throw error;
    cached = stale;
  }
  return cached;
}

function toEntry(section: GuideSection): DocEntry {
  return {
    name: `guide:${section.page}#${section.anchor}`,
    display: section.title,
    pkg: section.group,
    owner: "",
    kind: "guide",
    section: "guide",
    page: section.page,
    anchor: section.anchor,
  };
}

export async function loadGuides(): Promise<DocEntry[]> {
  const guides = await ensureGuides();
  return guides.sections.map(toEntry);
}

export async function refreshGuides(): Promise<DocEntry[]> {
  const guides = await ensureGuides(true);
  return guides.sections.map(toEntry);
}

export function isFaqEntry(entry: DocEntry): boolean {
  return entry.kind === "guide" && entry.page === FAQ_PAGE;
}

export async function guideHtml(entry: DocEntry): Promise<string | null> {
  const guides = await ensureGuides();
  return (
    guides.sections.find(
      (section) =>
        section.page === entry.page && section.anchor === entry.anchor,
    )?.html ?? null
  );
}
