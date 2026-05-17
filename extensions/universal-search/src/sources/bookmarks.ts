import { homedir } from "os";
import path from "path";
import { mkdtemp, writeFile, copyFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { SearchResult, SourceContext, SourceOutput } from "../types";
import { matchesAllTerms, matchesAny, parseQuery, run, runWithStdin } from "./util";

type Flat = { title: string; url: string };

let cache: { mtime: number; flat: Flat[] } | null = null;
let lastError: string | null = null;

function bookmarksPlistPath(): string {
  return path.join(homedir(), "Library/Safari/Bookmarks.plist");
}

export function getBookmarkError(): string | null {
  return lastError;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

/**
 * Minimal Safari Bookmarks.plist XML walker. Extracts (title, url) for every
 * dict that contains a URLString key. Uses depth-tracking to associate the
 * nested URIDictionary→title with its enclosing bookmark dict.
 */
function parseSafariBookmarksXml(xml: string): Flat[] {
  const out: Flat[] = [];
  type Frame = { url?: string; uriTitle?: string; topTitle?: string; pendingKey?: string };
  const stack: Frame[] = [];
  let uriDictDepth = -1;

  const re = /<\?[\s\S]*?\?>|<![\s\S]*?>|<(\/?)(\w+)([^>]*?)>([^<]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    if (!m[2]) continue; // declaration / DOCTYPE / comment
    const closing = m[1] === "/";
    const name = m[2];
    const attrs = m[3] ?? "";
    const text = m[4] ?? "";
    const selfClose = !closing && attrs.endsWith("/");

    if (closing) {
      if (name === "dict") {
        const f = stack.pop();
        if (f?.url) {
          const title = decodeEntities(f.uriTitle || f.topTitle || f.url);
          out.push({ title, url: decodeEntities(f.url) });
        }
        if (uriDictDepth >= 0 && stack.length <= uriDictDepth) uriDictDepth = -1;
      }
      continue;
    }
    if (selfClose) {
      const top = stack[stack.length - 1];
      if (top) top.pendingKey = undefined;
      continue;
    }

    if (name === "dict") {
      const parent = stack[stack.length - 1];
      if (parent?.pendingKey === "URIDictionary") uriDictDepth = stack.length;
      if (parent) parent.pendingKey = undefined;
      stack.push({});
    } else if (name === "array") {
      const parent = stack[stack.length - 1];
      if (parent) parent.pendingKey = undefined;
    } else if (name === "key") {
      const top = stack[stack.length - 1];
      if (top) top.pendingKey = text;
    } else if (name === "string") {
      const top = stack[stack.length - 1];
      if (top?.pendingKey) {
        if (top.pendingKey === "URLString") top.url = text;
        else if (top.pendingKey === "Title") top.topTitle = text;
        else if (top.pendingKey === "title" && uriDictDepth === stack.length - 1 && stack.length >= 2) {
          stack[stack.length - 2].uriTitle = text;
        }
        top.pendingKey = undefined;
      }
    } else {
      const top = stack[stack.length - 1];
      if (top) top.pendingKey = undefined;
    }
  }
  return out;
}

async function loadBookmarks(signal: AbortSignal): Promise<Flat[]> {
  const plist = bookmarksPlistPath();
  const { statSync } = await import("fs");
  let s;
  try {
    s = statSync(plist);
  } catch (e) {
    lastError = `stat failed: ${(e as Error).message}. Grant Raycast Full Disk Access.`;
    console.error("[universal-search/bookmarks]", lastError);
    return [];
  }
  if (cache && cache.mtime === s.mtimeMs && cache.flat.length > 0) return cache.flat;

  // Convert to XML (JSON conversion fails when the plist contains Date / Data values).
  let xml = "";
  try {
    xml = await run("plutil", ["-convert", "xml1", "-o", "-", plist], signal, 200_000_000);
  } catch (e) {
    lastError = `plutil xml1: ${(e as Error).message}`;
    console.error("[universal-search/bookmarks]", lastError);
  }
  if (!xml.trim()) {
    try {
      const { readFile } = await import("fs/promises");
      const buf = await readFile(plist);
      xml = await runWithStdin("plutil", ["-convert", "xml1", "-o", "-", "-"], buf, signal, 200_000_000);
    } catch (e) {
      lastError = `Read+plutil xml1 fallback failed: ${(e as Error).message}. Grant Raycast Full Disk Access.`;
      console.error("[universal-search/bookmarks]", lastError);
      return [];
    }
  }
  if (!xml.trim()) {
    lastError = "plutil produced empty XML output.";
    console.error("[universal-search/bookmarks]", lastError);
    return [];
  }

  let flat: Flat[] = [];
  try {
    flat = parseSafariBookmarksXml(xml);
  } catch (e) {
    lastError = `XML parse failed: ${(e as Error).message}`;
    console.error("[universal-search/bookmarks]", lastError);
    return [];
  }

  if (flat.length === 0) {
    lastError = "Parsed Safari Bookmarks.plist but found no bookmark leaves.";
    console.error("[universal-search/bookmarks]", lastError);
  } else {
    lastError = null;
  }

  cache = { mtime: s.mtimeMs, flat };
  return flat;
}

function removeBookmarkDictFromXml(xml: string, url: string): { xml: string; removed: boolean } {
  type Frame = { start: number; url?: string; pendingKey?: string };
  const stack: Frame[] = [];
  const re = /<\?[\s\S]*?\?>|<![\s\S]*?>|<(\/?)(\w+)([^>]*?)>([^<]*)/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(xml)) !== null) {
    if (!m[2]) continue;
    const closing = m[1] === "/";
    const name = m[2];
    const attrs = m[3] ?? "";
    const text = m[4] ?? "";
    const selfClose = !closing && attrs.endsWith("/");

    if (closing) {
      if (name === "dict") {
        const f = stack.pop();
        if (f?.url && decodeEntities(f.url) === url) {
          return { xml: xml.slice(0, f.start) + xml.slice(re.lastIndex), removed: true };
        }
      }
      continue;
    }

    if (selfClose) {
      const top = stack[stack.length - 1];
      if (top) top.pendingKey = undefined;
      continue;
    }

    if (name === "dict") {
      const parent = stack[stack.length - 1];
      if (parent) parent.pendingKey = undefined;
      stack.push({ start: m.index });
    } else if (name === "array") {
      const top = stack[stack.length - 1];
      if (top) top.pendingKey = undefined;
    } else if (name === "key") {
      const top = stack[stack.length - 1];
      if (top) top.pendingKey = text;
    } else if (name === "string") {
      const top = stack[stack.length - 1];
      if (top?.pendingKey === "URLString") top.url = text;
      if (top) top.pendingKey = undefined;
    } else {
      const top = stack[stack.length - 1];
      if (top) top.pendingKey = undefined;
    }
  }

  return { xml, removed: false };
}

export async function removeSafariBookmark(url: string, signal: AbortSignal): Promise<void> {
  const plist = bookmarksPlistPath();
  let xml = "";
  try {
    xml = await run("plutil", ["-convert", "xml1", "-o", "-", plist], signal, 200_000_000);
  } catch (e) {
    throw new Error(`Could not read Safari bookmarks: ${(e as Error).message}`);
  }

  const updated = removeBookmarkDictFromXml(xml, url);
  if (!updated.removed) throw new Error("Bookmark was not found in Safari bookmarks.");

  let tmp: string | null = null;
  try {
    tmp = await mkdtemp(path.join(tmpdir(), "us-bookmarks-"));
    const xmlPath = path.join(tmp, "Bookmarks.xml");
    const binaryPath = path.join(tmp, "Bookmarks.plist");
    await writeFile(xmlPath, updated.xml, "utf8");
    await run("plutil", ["-convert", "binary1", "-o", binaryPath, xmlPath], signal, 200_000_000);
    await copyFile(binaryPath, plist);
    cache = null;
    lastError = null;
  } catch (e) {
    throw new Error(`Could not update Safari bookmarks: ${(e as Error).message}`);
  } finally {
    if (tmp) {
      try {
        await rm(tmp, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  }
}

export async function searchBookmarks(ctx: SourceContext): Promise<SourceOutput> {
  const parsed = parseQuery(ctx.query);
  if (parsed.extensions.length > 0) return { results: [], total: 0 };
  if (parsed.terms.length === 0) return { results: [], total: 0 };
  const items = await loadBookmarks(ctx.signal);
  const excludes = ctx.exclude ?? [];
  const results: SearchResult[] = [];
  let total = 0;
  for (const b of items) {
    if (matchesAny(b.url, excludes)) continue;
    if (matchesAllTerms(b.title + " " + b.url, parsed.terms)) {
      total++;
      if (results.length >= ctx.limit) continue;
      let host = "";
      try {
        host = new URL(b.url).host;
      } catch {
        host = b.url;
      }
      results.push({
        id: "bm:" + b.url,
        kind: "bookmark",
        title: b.title,
        subtitle: host,
        url: b.url,
      });
    }
  }
  return { results, total };
}
