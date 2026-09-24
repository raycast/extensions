import { load, type CheerioAPI } from "cheerio";

export interface SavedPage {
  url: string;
  title: string;
  markdown: string;
  fetchedAt: string;
}

export interface SearchResult {
  page: SavedPage;
  excerpt: string;
  score: number;
}

export type SearchIndex = Record<string, Array<[pageIndex: number, titleHits: number, bodyHits: number]>>;

const STOP_WORDS = new Set(["a", "an", "and", "do", "does", "for", "how", "i", "in", "is", "of", "the", "this", "to", "with"]);

function termsIn(value: string): string[] {
  return value.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

export function buildIndex(pages: SavedPage[]): SearchIndex {
  const index: SearchIndex = Object.create(null) as SearchIndex;
  pages.forEach((page, pageIndex) => {
    const titleCounts = new Map<string, number>();
    const bodyCounts = new Map<string, number>();
    for (const term of termsIn(page.title)) titleCounts.set(term, (titleCounts.get(term) ?? 0) + 1);
    for (const term of termsIn(page.markdown)) bodyCounts.set(term, (bodyCounts.get(term) ?? 0) + 1);
    for (const term of new Set([...titleCounts.keys(), ...bodyCounts.keys()])) {
      (index[term] ??= []).push([pageIndex, titleCounts.get(term) ?? 0, bodyCounts.get(term) ?? 0]);
    }
  });
  return index;
}

const SKIP_EXTENSIONS = /\.(?:pdf|png|jpe?g|gif|webp|svg|ico|css|js|json|xml|zip|gz|mp4|webm|woff2?|ttf|eot)$/i;

export function normalizeUrl(candidate: string, base: URL, root: URL): string | null {
  let url: URL;
  try {
    url = new URL(candidate, base);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.origin !== root.origin) return null;
  const rootBase = root.pathname.replace(/\/$/, "") || "/";
  const rootPath = rootBase === "/" ? "/" : `${rootBase}/`;
  if (url.pathname !== rootBase && !url.pathname.startsWith(rootPath)) return null;
  if (SKIP_EXTENSIONS.test(url.pathname)) return null;
  url.hash = "";
  url.search = "";
  return url.toString();
}

function markdownFromHtml($: CheerioAPI, content: ReturnType<CheerioAPI>): string {
  const lines: string[] = [];
  content.find("script, style, nav, footer, aside, [aria-hidden='true'], .sidebar, .toc, .table-of-contents").remove();
  content.find("h1, h2, h3, h4, h5, h6, p, li, pre, blockquote").each((_, element) => {
    const node = $(element);
    if (node.parents("pre, p, li, blockquote").length > 0) return;
    let value = node.text().replace(/\s+/g, " ").trim();
    if (!value) return;
    const tag = element.tagName?.toLowerCase();
    if (tag === "pre") {
      const codeLines = node.find(".line");
      value = codeLines.length ? codeLines.map((_, line) => $(line).text()).get().join("\n").trim() : node.text().trim();
      lines.push(`\`\`\`\n${value}\n\`\`\``);
    } else if (tag?.startsWith("h")) {
      lines.push(`${"#".repeat(Number(tag[1]))} ${value}`);
    } else if (tag === "li") {
      lines.push(`- ${value}`);
    } else if (tag === "blockquote") {
      lines.push(`> ${value}`);
    } else {
      node.find("code").each((_, code) => {
        const text = $(code).text();
        value = value.replace(text, `\`${text}\``);
      });
      lines.push(value);
    }
  });
  return lines.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

function linksFromMarkdown(body: string, base: URL, root: URL): string[] {
  const prose = body.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, "");
  return [...prose.matchAll(/(?<!!)\[[^\]\n]+\]\((<[^>\n]+>|[^)\n]+)\)/g)]
    .map((match) => match[1].startsWith("<") ? match[1].slice(1, -1) : match[1])
    .map((candidate) => normalizeUrl(candidate, base, root))
    .filter((link): link is string => Boolean(link));
}

export function extractPage(html: string, url: string, root: URL): { title: string; markdown: string; links: string[] } {
  const $ = load(html);
  const base = new URL(url);
  const content = $("main, article, [role='main']").first();
  const heading = $("h1").first();
  const headingSection = heading.parents().filter((_, element) => {
    const node = $(element);
    return node.text().trim().length >= 120 && node.find("p, pre").length > 0;
  }).first();
  const selected = content.length ? content : headingSection.length ? headingSection : $("body");
  const headingTitle = selected.find("h1").first().text().trim() || $("title").text().trim() || base.pathname;
  const slug = decodeURIComponent(base.pathname.split("/").filter(Boolean).at(-1) || "").replace(/[-_]+/g, " ").trim();
  const title = slug && !headingTitle.replace(/[-_]+/g, " ").toLocaleLowerCase().includes(slug.toLocaleLowerCase())
    ? `${slug.replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase())} — ${headingTitle}`
    : headingTitle;
  const links = new Set<string>();
  $("a[href]").each((_, link) => {
    const normalized = normalizeUrl($(link).attr("href") ?? "", base, root);
    if (normalized) links.add(normalized);
  });
  return { title, markdown: markdownFromHtml($, selected), links: [...links] };
}

export function searchPages(pages: SavedPage[], query: string, index = buildIndex(pages)): SearchResult[] {
  const terms = [...new Set(termsIn(query))].filter((term) => !STOP_WORDS.has(term));
  if (!terms.length) return pages.map((page) => ({ page, excerpt: page.markdown.slice(0, 220), score: 0 }));
  const results: SearchResult[] = [];
  const scores = new Map<number, { score: number; matched: number; terms: string[] }>();
  for (const term of terms) {
    for (const [pageIndex, titleHits, bodyHits] of index[term] ?? []) {
      const entry = scores.get(pageIndex) ?? { score: 0, matched: 0, terms: [] };
      entry.score += titleHits * 100 + Math.min(bodyHits, 20);
      entry.matched++;
      entry.terms.push(term);
      scores.set(pageIndex, entry);
    }
  }
  for (const [pageIndex, match] of scores) {
    const page = pages[pageIndex];
    if (!page) continue;
    const body = page.markdown.toLocaleLowerCase();
    const first = Math.min(...match.terms.map((term) => {
      const index = body.indexOf(term);
      return index < 0 ? Number.POSITIVE_INFINITY : index;
    }));
    const start = Number.isFinite(first) ? Math.max(0, first - 70) : 0;
    const excerpt = page.markdown.slice(start, start + 220).replace(/[#*`\n]/g, " ").replace(/\s+/g, " ").trim();
    results.push({ page, excerpt, score: match.score * match.matched });
  }
  return results.sort((a, b) => b.score - a.score || a.page.title.localeCompare(b.page.title));
}

export interface CrawlProgress { done: number; queued: number; current: string }

export interface CrawlResult { pages: SavedPage[]; pageCount: number; errors: string[]; skipped: string[]; truncated: boolean }

export function coveredDrizzleAliases(skipped: string[], savedUrls: Set<string>): string[] {
  return skipped.filter((entry) => {
    const url = entry.split(": HTTP ")[0];
    const candidate = new URL(url);
    if (candidate.hostname !== "orm.drizzle.team" || !candidate.pathname.startsWith("/docs/pg/")) return true;
    candidate.pathname = candidate.pathname.replace("/docs/pg/", "/docs/");
    return !savedUrls.has(candidate.toString());
  });
}

export function trpcSavedAlias(url: URL): string | null {
  if (url.hostname !== "trpc.io" || url.pathname !== "/docs" && !url.pathname.startsWith("/docs/")) return null;
  const path = url.pathname.slice("/docs".length);
  const aliases: Record<string, string> = {
    "/client/links/overview": "/client/links",
    "/client/nextjs/app-router/server-actions": "/client/nextjs/server-actions",
    "/client/nextjs/app-router/setup": "/client/nextjs/app-router-setup",
    "/client/nextjs/overview": "/client/nextjs",
    "/client/openapi": "/openapi",
    // The current site's llms.txt still lists this removed overview; its full text survives in v10.
    "/client/overview": "/v10/client",
    "/client/react/overview": "/client/react",
    "/client/tanstack-react-query/overview": "/client/tanstack-react-query",
    "/client/vanilla/overview": "/client/vanilla",
    "/further/faq": "/faq",
    "/further/further-reading": "/further-reading",
    "/further/rpc": "/rpc",
    "/main/concepts": "/concepts",
    "/main/example-apps": "/example-apps",
    "/main/introduction": "",
    "/main/quickstart": "/quickstart",
    "/main/skills": "/skills",
    "/main/videos-and-community-resources": "/videos-and-community-resources",
    "/migration/migrate-from-v10-to-v11": "/migrate-from-v10-to-v11",
    "/links/localLink": "/client/links/localLink",
  };
  const current = aliases[path];
  return current === undefined ? null : `${url.origin}/docs${current}`;
}

export function coveredSavedAliases(skipped: string[], savedUrls: Set<string>): string[] {
  return coveredDrizzleAliases(skipped, savedUrls).filter((entry) => {
    const url = new URL(entry.split(": HTTP ")[0]);
    const alias = trpcSavedAlias(url);
    return !alias || !savedUrls.has(alias);
  });
}

async function fetchPage(url: string | URL): Promise<Response> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { headers: { Accept: "text/html" }, signal: AbortSignal.timeout(15000) });
      if ((response.status !== 429 && response.status < 500) || attempt === 2) return response;
    } catch (error) {
      if (attempt === 2) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }
  throw new Error(`Could not fetch ${url}`);
}

export async function crawlDocs(input: string, onProgress?: (progress: CrawlProgress) => void, maxPages = 2000, onPage?: (page: SavedPage) => Promise<void>, retainPages = true): Promise<CrawlResult> {
  const root = new URL(input);
  if (!(["https:", "http:"].includes(root.protocol))) throw new Error("Enter an HTTP or HTTPS documentation URL.");
  root.hash = "";
  root.search = "";
  const queue = [root.toString()];
  // A published documentation index can expose pages that HTML navigation omits.
  const indexUrls = [...new Set([new URL("llms.txt", root).toString(), new URL("/llms.txt", root).toString()])];
  for (const indexUrl of indexUrls) {
    try {
      const response = await fetch(indexUrl, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) continue;
      const index = await response.text();
      const candidates = [...index.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map((match) => match[1]);
      for (const candidate of candidates) {
        const normalized = normalizeUrl(candidate, new URL(indexUrl), root);
        if (normalized && !queue.includes(normalized)) queue.push(normalized);
      }
      break;
    } catch { /* Try the other index location, then continue with HTML links. */ }
  }
  const visited = new Set<string>();
  const pages: SavedPage[] = [];
  const savedUrls = new Set<string>();
  let pageCount = 0;
  const errors: string[] = [];
  const skipped: string[] = [];
  while (queue.length && visited.size < maxPages) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    onProgress?.({ done: pageCount, queued: queue.length, current });
    try {
      let response = await fetchPage(current);
      if (current === root.toString() && response.status === 404 && root.pathname.endsWith("/") && root.pathname !== "/") {
        const withoutSlash = new URL(root);
        withoutSlash.pathname = withoutSlash.pathname.slice(0, -1);
        response = await fetchPage(withoutSlash);
      }
      if (current !== root.toString() && (response.status === 404 || response.status === 410)) {
        skipped.push(`${current}: HTTP ${response.status}`);
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const sourceUrl = normalizeUrl(response.url, root, root) ?? (() => {
        const redirected = new URL(response.url);
        if (current !== root.toString() && redirected.origin === root.origin && !SKIP_EXTENSIONS.test(redirected.pathname)) {
          redirected.hash = "";
          redirected.search = "";
          return redirected.toString();
        }
        return null;
      })();
      if (!sourceUrl) {
        if (current === root.toString()) throw new Error("Redirected outside the documentation URL's scope.");
        skipped.push(`${current}: redirected outside the documentation URL's scope`);
        continue;
      }
      if (sourceUrl !== current && visited.has(sourceUrl)) continue;
      visited.add(sourceUrl);
      const contentType = response.headers.get("content-type") ?? "";
      const body = await response.text();
      let title: string;
      let markdown: string;
      let links: string[];
      if (contentType.includes("text/markdown") || current.endsWith(".md")) {
        markdown = body;
        title = body.match(/^#\s+(.+)$/m)?.[1] || new URL(sourceUrl).pathname.split("/").pop() || sourceUrl;
        links = linksFromMarkdown(body, new URL(sourceUrl), root);
      } else if (contentType.includes("text/html")) {
        ({ title, markdown, links } = extractPage(body, sourceUrl, root));
      } else continue;
      if (markdown) {
        const page = { url: sourceUrl, title, markdown, fetchedAt: new Date().toISOString() };
        await onPage?.(page);
        savedUrls.add(sourceUrl);
        pageCount++;
        if (retainPages) pages.push(page);
      }
      for (const link of links) if (!visited.has(link) && !queue.includes(link)) queue.push(link);
    } catch (error) {
      errors.push(`${current}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { pages, pageCount, errors, skipped: coveredSavedAliases(skipped, savedUrls), truncated: queue.length > 0 };
}

export async function crawlWithFirecrawl(input: string, endpoint: string, onProgress?: (progress: CrawlProgress) => void, maxPages = 2000, onPage?: (page: SavedPage) => Promise<void>, retainPages = true): Promise<CrawlResult> {
  const root = new URL(input);
  if (!["https:", "http:"].includes(root.protocol)) throw new Error("Enter an HTTP or HTTPS documentation URL.");
  const server = new URL(endpoint);
  if (!["127.0.0.1", "localhost", "[::1]"].includes(server.hostname) || server.protocol !== "http:") {
    throw new Error("Firecrawl must be a local HTTP service.");
  }
  root.hash = "";
  root.search = "";
  const path = root.pathname.replace(/\/$/, "") || "/";
  const includePath = path === "/" ? "^/" : `^${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:/|$)`;
  const api = new URL("/v2/crawl", server);
  const started = await fetch(api, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: root.toString(), limit: maxPages, includePaths: [includePath], scrapeOptions: { formats: ["markdown"], onlyMainContent: true } }),
    signal: AbortSignal.timeout(20000),
  });
  const startData = await started.json() as { id?: string; error?: string };
  if (!started.ok || !startData.id) throw new Error(startData.error || `Firecrawl returned HTTP ${started.status}`);
  const statusUrl = new URL(`/v2/crawl/${encodeURIComponent(startData.id)}`, server);
  const deadline = Date.now() + 10 * 60 * 1000;
  let status: "scraping" | "completed" | "failed" = "scraping";
  let completed = 0;
  let total = 0;
  let lastProgressAt = Date.now();
  try {
    while (status === "scraping" && Date.now() < deadline) {
      const response = await fetch(statusUrl, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`Firecrawl status returned HTTP ${response.status}`);
      const data = await response.json() as { status: "scraping" | "completed" | "failed"; completed?: number; total?: number; error?: string };
      status = data.status;
      if ((data.completed ?? 0) > completed) lastProgressAt = Date.now();
      completed = data.completed ?? completed;
      total = data.total ?? total;
      onProgress?.({ done: completed, queued: Math.max(0, total - completed), current: "Firecrawl is downloading pages" });
      if (status === "failed") throw new Error(data.error || "Firecrawl crawl failed.");
      if (status === "scraping" && Date.now() - lastProgressAt > 60000) throw new Error(`Firecrawl stalled at ${completed} of ${total} pages. Try the built-in crawler.`);
      if (status === "scraping") await new Promise((resolve) => setTimeout(resolve, 700));
    }
    if (status !== "completed") throw new Error("Firecrawl did not finish within ten minutes.");
  } catch (error) {
    await fetch(statusUrl, { method: "DELETE", signal: AbortSignal.timeout(5000) }).catch(() => undefined);
    throw error;
  }

  const pages: SavedPage[] = [];
  const pageUrls = new Set<string>();
  let pageCount = 0;
  const seen = new Set<string>();
  let next: URL | undefined = statusUrl;
  do {
    if (seen.has(next.toString())) break;
    seen.add(next.toString());
    const response = await fetch(next, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Firecrawl result returned HTTP ${response.status}`);
    const data = await response.json() as { data?: Array<{ markdown?: string; metadata?: { sourceURL?: string; title?: string; statusCode?: number } }>; next?: string | null };
    for (const item of data.data ?? []) {
      const url = item.metadata?.sourceURL && normalizeUrl(item.metadata.sourceURL, root, root);
      if (!url || !item.markdown || (item.metadata?.statusCode ?? 200) >= 400 || pageUrls.has(url)) continue;
      const page = { url, title: item.metadata?.title || item.markdown.match(/^#\s+(.+)$/m)?.[1] || url, markdown: item.markdown, fetchedAt: new Date().toISOString() };
      pageUrls.add(url);
      await onPage?.(page);
      pageCount++;
      if (retainPages) pages.push(page);
    }
    next = data.next ? new URL(data.next, server) : undefined;
    if (next && next.origin !== server.origin) throw new Error("Firecrawl returned a non-local result URL.");
  } while (next);
  return { pages, pageCount, errors: [], skipped: [], truncated: completed >= maxPages };
}
