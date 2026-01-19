import * as cheerio from "cheerio";
import { DocEntry } from "../types/DocEntry";
import { DjangoVersion } from "../constants";
import { fetchSitemap } from "./sitemap";
import { filterTopicsUrls, getSectionParentUrl } from "../utils/url-filters";
import {
  createTurndownService,
  resolveRelativeUrls,
  removeHeaderLinks,
  stripPilcrows,
} from "../utils/html-to-markdown";
import { showToast, Toast } from "@raycast/api";

interface PageContent {
  title: string;
  content: string;
  prevUrl: string | null;
  nextUrl: string | null;
}

/**
 * Processes items in parallel batches to avoid overwhelming the server
 * while still achieving better performance than sequential processing.
 *
 * @param items - Array of items to process
 * @param mapper - Async function that processes each item
 * @param batchSize - Number of items to process concurrently (default: 10)
 * @returns Array of results in the same order as input items
 */
async function fetchInBatches<T, R>(items: T[], mapper: (item: T) => Promise<R>, batchSize: number = 10): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchPromises = batch.map((item) => mapper(item));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

export async function fetchPageContent(url: string): Promise<PageContent> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  const data = await response.text();
  const $ = cheerio.load(data);

  // Extract prev/next from the Browse navigation before any modifications
  const browseNav = $('nav[aria-labelledby="browse-header"]');
  let prevHref = browseNav.find('a[rel="prev"]').attr("href");
  let nextHref = browseNav.find('a[rel="next"]').attr("href");
  const fallbackNav = $('nav.browse-horizontal[aria-labelledby="browse-horizontal-header"]');

  if (!prevHref) {
    prevHref = fallbackNav.find('.left a[rel="prev"]').attr("href");
  }
  if (!nextHref) {
    nextHref = fallbackNav.find('.right a[rel="next"]').attr("href");
  }

  const prevUrl = prevHref ? new URL(prevHref, url).href : null;
  const nextUrl = nextHref ? new URL(nextHref, url).href : null;
  // Clean up the HTML before extraction
  removeHeaderLinks($);
  resolveRelativeUrls($, url);

  const title = stripPilcrows($("h1").first().text().trim()) || "Untitled";
  const contentHtml = $("#docs-content").html() || $(".body").html() || $("article").html() || "";
  const turndownService = createTurndownService();
  const markdown = stripPilcrows(turndownService.turndown(contentHtml));

  return { title, content: markdown, prevUrl, nextUrl };
}

export async function fetchDocEntries(version: DjangoVersion): Promise<DocEntry[]> {
  const allUrls = await fetchSitemap();
  const filteredUrls = filterTopicsUrls(allUrls, version);

  const rawEntries = await fetchInBatches(filteredUrls, async (url) => {
    try {
      const { title, content, prevUrl, nextUrl } = await fetchPageContent(url);
      return { url, title, content, prevUrl, nextUrl };
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error);
      showToast({ style: Toast.Style.Failure, title: `Failed to fetch ${url}` });
      throw error;
    }
  });

  // Create DocEntry objects with null references initially
  const entries: DocEntry[] = rawEntries.map((raw) => ({
    url: raw.url,
    title: raw.title,
    content: raw.content,
    parent: null,
    previous: null,
    next: null,
  }));

  // Build a map for O(1) lookups when linking references
  const entryByUrl = new Map<string, DocEntry>(entries.map((e) => [e.url, e]));

  // Link parent, prev, and next references
  for (const [index, entry] of entries.entries()) {
    const raw = rawEntries[index];

    // Parent: section top-level entry (e.g., /ref/class-based-views/ for all its children)
    const parentUrl = getSectionParentUrl(entry.url);
    entry.parent = parentUrl ? (entryByUrl.get(parentUrl) ?? null) : null;

    // Prev/Next: from Django's Browse navigation
    entry.previous = raw.prevUrl ? (entryByUrl.get(raw.prevUrl) ?? null) : null;
    entry.next = raw.nextUrl ? (entryByUrl.get(raw.nextUrl) ?? null) : null;
  }

  return entries;
}
