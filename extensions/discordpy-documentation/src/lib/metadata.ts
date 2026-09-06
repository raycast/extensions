import { environment } from "@raycast/api";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CACHE_SCHEMA, docsVersion } from "./constants";
import { fetchPage } from "./docpage";
import { DocEntry, EntryMeta, MetaIndex } from "./types";

const META_TTL = 24 * 60 * 60 * 1000;
const DENSE_PAGE_THRESHOLD = 20;
const INTENT_PATTERN = /(?:requires?|needs?)[^.]{0,200}?Intents\.([a-z_]+)/gi;

interface StoredMeta {
  fetchedAt: number;
  meta: MetaIndex;
}

function metaFile(): string {
  return path.join(
    environment.supportPath,
    `meta-${CACHE_SCHEMA}-${docsVersion()}.json`,
  );
}

const TERM_PATTERN = /<dt class="sig[^"]*"\s+id="([^"]+)"/g;
const BODY_LIMIT = 20000;

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function describe(signature: string, body: string): EntryMeta | null {
  const meta: EntryMeta = {};

  if (
    /^(?:await|async with|async for)\b/.test(signature) ||
    /this function is a\s*coroutine/i.test(body)
  ) {
    meta.coroutine = true;
  }

  const intents = new Set<string>();
  for (const match of body.matchAll(INTENT_PATTERN)) intents.add(match[1]);
  if (intents.size) meta.intents = [...intents];

  return meta.coroutine || meta.intents ? meta : null;
}

function scanPage(html: string, meta: MetaIndex): void {
  const terms = [...html.matchAll(TERM_PATTERN)];

  for (let index = 0; index < terms.length; index++) {
    const term = terms[index];
    const from = term.index ?? 0;
    const termEnd = html.indexOf("</dt>", from);
    if (termEnd === -1) continue;

    // Sphinx documents paired events as two <dt> elements sharing one <dd>,
    // so the body starts at the next <dd> rather than right after this term.
    const bodyStart = html.indexOf("<dd", termEnd);
    if (bodyStart === -1) continue;

    const following = terms.find(
      (candidate) => (candidate.index ?? 0) > bodyStart,
    );
    const nextTerm = following?.index ?? html.length;
    const nested = html.indexOf('<dl class="py', bodyStart);
    const bodyEnd = Math.min(
      nextTerm,
      nested === -1 ? nextTerm : nested,
      bodyStart + BODY_LIMIT,
    );

    const described = describe(
      stripTags(html.slice(from, termEnd)),
      stripTags(html.slice(bodyStart, bodyEnd)),
    );
    if (described) meta[term[1]] = described;
  }
}

function densePages(entries: DocEntry[]): string[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    if (entry.kind === "guide") continue;
    counts.set(entry.page, (counts.get(entry.page) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= DENSE_PAGE_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .map(([page]) => page);
}

async function scan(entries: DocEntry[], force: boolean): Promise<MetaIndex> {
  const meta: MetaIndex = {};
  for (const page of densePages(entries)) {
    scanPage(await fetchPage(page, force), meta);
  }
  return meta;
}

async function readStored(): Promise<StoredMeta | null> {
  try {
    return JSON.parse(await readFile(metaFile(), "utf8")) as StoredMeta;
  } catch {
    return null;
  }
}

export async function ensureMeta(
  entries: DocEntry[],
  force = false,
): Promise<MetaIndex> {
  const stored = await readStored();
  if (!force && stored && Date.now() - stored.fetchedAt < META_TTL)
    return stored.meta;
  if (!entries.length) return stored?.meta ?? {};

  try {
    const meta = await scan(entries, force);
    await mkdir(environment.supportPath, { recursive: true });
    await writeFile(
      metaFile(),
      JSON.stringify({ fetchedAt: Date.now(), meta } satisfies StoredMeta),
      "utf8",
    );
    return meta;
  } catch {
    return stored?.meta ?? {};
  }
}
