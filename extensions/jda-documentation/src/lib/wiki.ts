import { environment } from "@raycast/api";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CACHE_SCHEMA, timeoutSignal, WIKI_BASE } from "./constants";
import { fetchPage } from "./pages";
import { DocEntry } from "./types";

const WIKI_INDEX = "search/search_index.json";
const WIKI_TTL = 24 * 60 * 60 * 1000;

export const FAQ_PAGE = "introduction/faq/";
export const TROUBLESHOOTING_PAGE = "using-jda/troubleshooting/";

const FAQ_PAGES = [FAQ_PAGE, TROUBLESHOOTING_PAGE];

interface WikiDocument {
  location: string;
  title: string;
  text: string;
}

interface StoredWiki {
  fetchedAt: number;
  documents: WikiDocument[];
}

let cached: StoredWiki | null = null;

function wikiFile(): string {
  return path.join(environment.supportPath, `wiki-${CACHE_SCHEMA}.json`);
}

async function download(): Promise<StoredWiki> {
  const response = await fetch(WIKI_BASE + WIKI_INDEX, {
    signal: timeoutSignal(),
  });
  if (!response.ok)
    throw new Error(
      `Failed to download the JDA wiki index (HTTP ${response.status})`,
    );

  const payload = (await response.json()) as { docs?: WikiDocument[] };
  const documents = (payload.docs ?? []).filter((document) => document.title);
  const stored: StoredWiki = { fetchedAt: Date.now(), documents };

  await mkdir(environment.supportPath, { recursive: true });
  await writeFile(wikiFile(), JSON.stringify(stored), "utf8");
  return stored;
}

async function readStored(): Promise<StoredWiki | null> {
  try {
    const stored = JSON.parse(await readFile(wikiFile(), "utf8")) as StoredWiki;
    return stored.documents?.length ? stored : null;
  } catch {
    return null;
  }
}

async function ensureWiki(force = false): Promise<StoredWiki> {
  if (cached && !force && Date.now() - cached.fetchedAt < WIKI_TTL)
    return cached;

  const stored = force ? null : await readStored();
  if (stored && Date.now() - stored.fetchedAt < WIKI_TTL) {
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

function splitLocation(location: string): { page: string; anchor: string } {
  const hash = location.indexOf("#");
  if (hash === -1) return { page: location, anchor: "" };
  return { page: location.slice(0, hash), anchor: location.slice(hash + 1) };
}

function humanise(page: string): string {
  const segments = page.split("/").filter(Boolean);
  if (!segments.length) return "Home";
  return segments
    .map((segment) =>
      segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
    )
    .join(" · ");
}

function toEntries(documents: WikiDocument[]): DocEntry[] {
  return documents
    .filter((document) => !document.location.startsWith(FAQ_PAGE))
    .map((document) => {
      const { page, anchor } = splitLocation(document.location);
      return {
        name: `wiki:${document.location}`,
        display: document.title,
        pkg: FAQ_PAGES.includes(page)
          ? `FAQ · ${humanise(page)}`
          : humanise(page),
        owner: "",
        kind: "guide" as const,
        section: "guide" as const,
        page,
        anchor,
        url: WIKI_BASE + document.location,
      };
    });
}

export async function loadGuides(): Promise<DocEntry[]> {
  try {
    return toEntries((await ensureWiki()).documents);
  } catch {
    return [];
  }
}

export async function refreshGuides(): Promise<DocEntry[]> {
  return toEntries((await ensureWiki(true)).documents);
}

const GUIDE_LIMIT = 30000;
const INTRO_MINIMUM = 200;

function articleBody(html: string): string {
  const start = html.indexOf("<article");
  if (start === -1) return html;
  const end = html.indexOf("</article>", start);
  return html.slice(start, end === -1 ? html.length : end);
}

// The mkdocs search index stores only the text between a heading and the next
// one of any level, so a section with sub-headings loses everything below the
// first of them. Slicing the rendered page keeps the whole section together.
function sliceHeading(article: string, anchor: string): string | null {
  if (!anchor) {
    const firstSection = article.search(/<h2[\s>]/);
    const intro = article.slice(
      0,
      firstSection === -1 ? undefined : firstSection,
    );
    return intro.length >= INTRO_MINIMUM ? intro : article;
  }

  // The id is not guaranteed to be the first attribute on the heading, so the
  // slice must not depend on the order mkdocs happens to emit them in today.
  const heading = new RegExp(
    `<h([1-6])\\b[^>]*\\bid="${anchor.replace(/[.*+?^$()|[\]\\]/g, "\\$&")}"`,
  );
  const match = heading.exec(article);
  if (!match) return null;

  const level = Number(match[1]);
  const bodyStart = article.indexOf(">", match.index) + 1;
  const rest = article.slice(bodyStart);
  const next = new RegExp(`<h[1-${level}][\\s>]`).exec(rest);

  return rest.slice(0, next ? next.index : GUIDE_LIMIT).slice(0, GUIDE_LIMIT);
}

export async function guideHtml(entry: DocEntry): Promise<string | null> {
  try {
    const article = articleBody(await fetchPage(entry.page, WIKI_BASE));
    const slice = sliceHeading(article, entry.anchor);
    if (slice) return slice;
  } catch {
    // Fall back to the text the search index already carries.
  }

  const location = entry.name.slice("wiki:".length);
  const wiki = await ensureWiki();
  return (
    wiki.documents.find((document) => document.location === location)?.text ??
    null
  );
}
