import { decodeRscChunks } from "./rsc";

export const MANUAL_BASE = "https://manual.raycast.com";

export type ManualPage = {
  slug: string;
  path: string;
  url: string;
  title: string;
  category: string;
};

type Entry = {
  title: string;
  slug?: string;
  href?: string;
  children?: Entry[];
};

function extractEntriesArray(rsc: string): string {
  const key = '"entries":';
  const keyIdx = rsc.indexOf(key);
  if (keyIdx < 0) throw new Error("Manual navigation not found in page source");
  const start = rsc.indexOf("[", keyIdx);
  if (start < 0) throw new Error("Manual navigation array start not found");
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = start; i < rsc.length; i++) {
    const ch = rsc[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return rsc.slice(start, i + 1);
    }
  }
  throw new Error("Manual navigation array is not terminated");
}

function parseEntries(raw: string): Entry[] {
  // RSC placeholders like "$undefined" or "$L1c" appear in some optional fields (e.g. badge).
  // Strip them so the array parses as plain JSON.
  const cleaned = raw.replace(/"\$[^"]*"/g, "null");
  return JSON.parse(cleaned) as Entry[];
}

function pathFromHref(href: string): string {
  try {
    return new URL(href, MANUAL_BASE).pathname;
  } catch {
    return href;
  }
}

function slugFromPath(path: string): string {
  if (path === "/" || path === "") return "home";
  return path.replace(/^\//, "").replace(/\//g, "-");
}

function flatten(entries: Entry[]): ManualPage[] {
  const pages: ManualPage[] = [];
  const seen = new Set<string>();

  const pushPage = (entry: Entry, category: string) => {
    if (!entry.href) return;
    // Skip cross-site links (e.g. Shared Extensions → developers.raycast.com).
    if (entry.href.startsWith("http") && !entry.href.startsWith(MANUAL_BASE)) return;
    const path = pathFromHref(entry.href);
    // Some section headings in the RSC tree reuse their first child's href (e.g. the
    // "Identity & Access Management" group points at /enterprise/saml-sso). Keep the first
    // occurrence — section headings appear before their children and have friendlier titles.
    if (seen.has(path)) return;
    seen.add(path);
    const url = entry.href.startsWith("http") ? entry.href : MANUAL_BASE + path;
    pages.push({
      slug: slugFromPath(path),
      path,
      url,
      title: entry.title,
      category,
    });
  };

  const visit = (items: Entry[], category: string) => {
    for (const item of items) {
      pushPage(item, category);
      if (item.children && item.children.length > 0) visit(item.children, category);
    }
  };

  for (const top of entries) {
    const hasChildren = !!(top.children && top.children.length > 0);
    if (hasChildren) {
      visit(top.children!, top.title);
    } else {
      // Standalone top-level pages (Community Guidelines, Extensions Guidelines, Contact Support)
      // have no parent category in the sidebar; group them so they don't end up uncategorised.
      pushPage(top, "Resources");
    }
  }

  return pages;
}

export function parseManualPages(html: string): ManualPage[] {
  const rsc = decodeRscChunks(html);
  const entriesRaw = extractEntriesArray(rsc);
  const entries = parseEntries(entriesRaw);
  return flatten(entries);
}
