import { useCallback, useEffect, useState } from "react";
import { LIMITS } from "../utils/config";
import { forEachWithConcurrency } from "../utils/fetcher";
import { loadSitemapFile, SitemapFile } from "../utils/sitemapLoader";
import { SitemapPage } from "../utils/sitemapParse";

/**
 * One child sitemap's outcome. Five states, because each says something
 * different about whether its pages were searched: `loaded` was, `failed` and
 * `skipped` were not and never will be in this run, `queued` and `loading` not
 * yet. A view that folds any of these into "no results" is reporting a check it
 * did not make.
 */
export type FileStatus =
  | { status: "queued" }
  | { status: "loading" }
  | {
      status: "loaded";
      pages: number;
      sitemaps: number;
      truncated: boolean;
      /** Pages in this file left out of search because the spider's page limit was reached. */
      unsearched: number;
    }
  | { status: "failed"; error: string }
  | { status: "skipped"; reason: string };

export interface SpiderFile {
  url: string;
  /** The opened index's direct child this file was reached through — the row it is reported on. */
  top: string;
  state: FileStatus;
}

export type RootState =
  { status: "loading" } | { status: "failed"; error: string } | { status: "loaded"; file: SitemapFile };

export interface SitemapState {
  root: RootState;
  /** Every descendant file the spider reached, keyed by URL. Empty unless the root is an index. */
  files: ReadonlyMap<string, SpiderFile>;
  /** Pages gathered from descendants, deduplicated by URL, in discovery order. */
  pages: readonly SitemapPage[];
  /** `pages` is appended in place; this changes when it does, for memo dependencies. */
  pageCount: number;
  /** Collection stopped at `LIMITS.SITEMAP_SPIDER_MAX_PAGES`. */
  pagesCapped: boolean;
  spidering: boolean;
}

const INITIAL: SitemapState = {
  root: { status: "loading" },
  files: new Map(),
  pages: [],
  pageCount: 0,
  pagesCapped: false,
  spidering: false,
};

const MB = 1024 * 1024;

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Loads a sitemap and, when it is an index, spiders its descendants so search
 * can cover every page rather than the file that happened to be opened.
 *
 * Breadth-first, a level at a time, under four budgets — files, bytes, pages and
 * depth. A file the budget stops is `skipped` with the reason, not dropped: the
 * view has to be able to say what was NOT searched.
 *
 * Each run owns its containers. A newer run (a reload, a remount in dev) aborts
 * the older one, whose late writes land in objects nothing reads any more and
 * whose `publish` is a no-op once its signal is aborted.
 */
export function useSitemap(url: string, siteUrl: string): SitemapState & { reload: () => void } {
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState<SitemapState>(INITIAL);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const refresh = refreshKey > 0;

    const files = new Map<string, SpiderFile>();
    const pages: SitemapPage[] = [];
    const seen = new Set<string>();
    let pagesCapped = false;
    let root: RootState = { status: "loading" };

    const publish = (spidering: boolean) => {
      if (signal.aborted) return;
      setState({ root, files: new Map(files), pages, pageCount: pages.length, pagesCapped, spidering });
    };
    const setFile = (fileUrl: string, next: FileStatus) => {
      const current = files.get(fileUrl);
      if (current) files.set(fileUrl, { ...current, state: next });
    };

    publish(false);

    (async () => {
      let file: SitemapFile;
      try {
        file = await loadSitemapFile(url, siteUrl, { signal, refresh });
      } catch (error) {
        if (signal.aborted) return;
        root = { status: "failed", error: message(error) };
        publish(false);
        return;
      }
      if (signal.aborted) return;
      root = { status: "loaded", file };
      if (file.parsed.kind !== "index") {
        publish(false);
        return;
      }

      const visited = new Set<string>([url]);
      let level: { url: string; top: string; depth: number }[] = [];
      for (const child of file.parsed.sitemaps) {
        if (visited.has(child.loc)) continue;
        visited.add(child.loc);
        files.set(child.loc, { url: child.loc, top: child.loc, state: { status: "queued" } });
        level.push({ url: child.loc, top: child.loc, depth: 1 });
      }
      publish(level.length > 0);

      let fetched = 0;
      let bytes = 0;

      while (level.length > 0 && !signal.aborted) {
        const next: typeof level = [];
        await forEachWithConcurrency(
          level,
          LIMITS.SITEMAP_SPIDER_CONCURRENCY,
          async (item) => {
            // Checked when a worker takes the file, so it is a SOFT byte cap: up
            // to CONCURRENCY - 1 files already in flight can finish past it. A
            // hard cap would have to reserve a whole file's worth per worker and
            // would skip ordinary 1 MB children on sites that never come close.
            const over =
              fetched >= LIMITS.SITEMAP_SPIDER_MAX_FILES
                ? `Over the ${LIMITS.SITEMAP_SPIDER_MAX_FILES}-sitemap limit`
                : bytes >= LIMITS.SITEMAP_SPIDER_MAX_BYTES
                  ? `Over the ${LIMITS.SITEMAP_SPIDER_MAX_BYTES / MB} MB limit`
                  : pagesCapped
                    ? `Over the ${LIMITS.SITEMAP_SPIDER_MAX_PAGES.toLocaleString()}-page limit`
                    : undefined;
            if (over) {
              setFile(item.url, { status: "skipped", reason: over });
              publish(true);
              return;
            }

            // Counted before the await, so concurrent workers see the budget spent.
            fetched++;
            setFile(item.url, { status: "loading" });
            publish(true);

            let child: SitemapFile;
            try {
              child = await loadSitemapFile(item.url, siteUrl, { signal, refresh });
            } catch (error) {
              if (signal.aborted) return;
              setFile(item.url, { status: "failed", error: message(error) });
              publish(true);
              return;
            }
            if (signal.aborted) return;
            // Bytes, as the budget is stated — `text.length` counts UTF-16 units.
            bytes += Buffer.byteLength(child.text, "utf8");

            const parsed = child.parsed;
            const truncated = child.truncated || (parsed.kind !== "invalid" && parsed.capped);
            if (parsed.kind === "urlset") {
              let unsearched = 0;
              for (const [index, page] of parsed.pages.entries()) {
                if (seen.has(page.loc)) continue;
                if (pages.length >= LIMITS.SITEMAP_SPIDER_MAX_PAGES) {
                  // Recorded on the file, not only globally: its row must not
                  // claim pages that search never saw.
                  pagesCapped = true;
                  // Distinct URLs this file still had that search never saw; a
                  // later duplicate of a page already collected was searched.
                  const missed = new Set<string>();
                  for (const rest of parsed.pages.slice(index)) if (!seen.has(rest.loc)) missed.add(rest.loc);
                  unsearched = missed.size;
                  break;
                }
                seen.add(page.loc);
                pages.push(page);
              }
              setFile(item.url, {
                status: "loaded",
                pages: parsed.pages.length,
                sitemaps: 0,
                truncated,
                unsearched,
              });
            } else if (parsed.kind === "index") {
              let nested = 0;
              for (const grandchild of parsed.sitemaps) {
                if (visited.has(grandchild.loc)) continue;
                visited.add(grandchild.loc);
                nested++;
                const tooDeep = item.depth >= LIMITS.SITEMAP_SPIDER_MAX_DEPTH;
                files.set(grandchild.loc, {
                  url: grandchild.loc,
                  top: item.top,
                  state: tooDeep
                    ? { status: "skipped", reason: `Nested more than ${LIMITS.SITEMAP_SPIDER_MAX_DEPTH} levels deep` }
                    : { status: "queued" },
                });
                if (!tooDeep) next.push({ url: grandchild.loc, top: item.top, depth: item.depth + 1 });
              }
              setFile(item.url, { status: "loaded", pages: 0, sitemaps: nested, truncated, unsearched: 0 });
            } else {
              // The server answered, but not with a sitemap: its pages were not searched.
              const answer = parsed.root ? `<${parsed.root}>` : "something that isn't XML";
              setFile(item.url, { status: "failed", error: `Not a sitemap: the server answered with ${answer}` });
            }
            publish(true);
          },
          signal,
        );
        level = next;
      }
      publish(false);
    })();

    return () => controller.abort();
  }, [url, siteUrl, refreshKey]);

  const reload = useCallback(() => setRefreshKey((key) => key + 1), []);
  return { ...state, reload };
}
