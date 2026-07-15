import fetch from "cross-fetch";
import dayjs from "dayjs";
import { todayUid } from "./utils";
import * as roamApiSdk from "./roam-api-sdk-copy";
import { Cache } from "@raycast/api";

export function initRoamBackendClient(graphName: string, graphToken: string) {
  return roamApiSdk.initializeGraph({ graph: graphName, token: graphToken });
}

export const BLOCK_QUERY = `:block/string :node/title :block/uid :edit/time :create/time :block/_refs {:block/_children [:block/uid :block/string :node/title {:block/_children ...}]} {:block/refs [:block/uid :block/string :node/title]}`;

export async function getBackRefs(backendClient: roamApiSdk.RoamBackendClient, uid: string) {
  const backRefsReversePullBlocks: ReversePullBlock[] = await roamApiSdk.q(
    backendClient,
    `[ :find [(pull ?e [${BLOCK_QUERY}]) ...] :in $ ?uid :where [?page :block/uid ?uid] [?e :block/refs ?page] [?e :block/string ?text]]`,
    [uid]
  );
  return backRefsReversePullBlocks;
}

const graphPagesAndTimeCache = new Cache({ namespace: "graph-pages" });
const GRAPH_PAGES_CACHE_EXPIRY_MS = 2 * 60 * 60 * 1000;

type GraphPagesDataInCache = [number, Record<string, string>];

async function getAllPagesBackend(graphConfig: GraphConfig) {
  const backendClient: roamApiSdk.RoamBackendClient = initRoamBackendClient(
    graphConfig.nameField,
    graphConfig.tokenField
  );
  const allPagesData: [string, string, number][] = await roamApiSdk.q(
    backendClient,
    "[:find ?uid ?page-title ?edit-time :where [?id :node/title ?page-title][?id :block/uid ?uid][(get-else $ ?id :page/edit-time 0) ?edit-time]]"
  );
  allPagesData.sort((a, b) => (b[2] || 0) - (a[2] || 0));
  // Insertion order matters: Object.entries(res) preserves edit-time sort for PageDropdown
  const res: { [key: string]: string } = {};
  for (const [blockUid, nodeTitle] of allPagesData) {
    res[blockUid] = nodeTitle;
  }
  const valueForCache: GraphPagesDataInCache = [Date.now(), res];
  // set it in the cache
  graphPagesAndTimeCache.set(graphConfig.nameField, JSON.stringify(valueForCache));
  // Prune used pages that no longer exist in the graph
  pruneStaleUsedPages(graphConfig.nameField, new Set(Object.values(res)));
  return res;
}

// Cached meaning that this does NOT do the getAllPages query to backend more than once every 2 hours i.e. GRAPH_PAGES_CACHE_EXPIRY_MS
// Only want this type of caching for this request right now, if we want for others too,
//    would probably be more well off writing another version of raycast util's `useCachedPromise` hook
export function getAllPagesCached(graphConfig: GraphConfig) {
  const valFromCacheJsonStr = graphPagesAndTimeCache.get(graphConfig.nameField);
  if (!valFromCacheJsonStr) {
    return getAllPagesBackend(graphConfig);
  }
  let valFromCache: GraphPagesDataInCache;
  try {
    valFromCache = JSON.parse(valFromCacheJsonStr);
  } catch {
    return getAllPagesBackend(graphConfig);
  }
  if (!(valFromCache && valFromCache.length == 2 && valFromCache[0] && valFromCache[1])) {
    return getAllPagesBackend(graphConfig);
  }
  const useValFromCache = Date.now() - valFromCache[0] < GRAPH_PAGES_CACHE_EXPIRY_MS;
  if (useValFromCache) {
    return Promise.resolve(valFromCache[1]);
  } else {
    return getAllPagesBackend(graphConfig);
  }
}

export function clearGraphPagesCache(graphName: string): void {
  graphPagesAndTimeCache.remove(graphName);
}

// Naming convention: graphPagesAndTimeCache → "graph-pages", graphUsedPagesCache → "graph-used-pages"
const graphUsedPagesCache = new Cache({ namespace: "graph-used-pages" });
const MAX_USED_PAGES = 20;

export function getUsedPages(graphName: string): string[] {
  const val = graphUsedPagesCache.get(graphName);
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addUsedPage(graphName: string, pageTitle: string): void {
  const current = getUsedPages(graphName);
  const filtered = current.filter((t) => t !== pageTitle);
  filtered.unshift(pageTitle); // most recent first
  graphUsedPagesCache.set(graphName, JSON.stringify(filtered.slice(0, MAX_USED_PAGES)));
}

function pruneStaleUsedPages(graphName: string, validTitles: Set<string>): void {
  const current = getUsedPages(graphName);
  const pruned = current.filter((title) => validTitles.has(title));
  if (pruned.length !== current.length) {
    graphUsedPagesCache.set(graphName, JSON.stringify(pruned));
  }
}

const tagPageTitlesStrSuffix = (pageTitlesToTagTopBlockWith: string[]) => {
  const hasTitles = pageTitlesToTagTopBlockWith && pageTitlesToTagTopBlockWith.length > 0;
  if (!hasTitles) {
    return "";
  } else {
    return pageTitlesToTagTopBlockWith.reduce(
      (accStr: string, newPageTitle: string) => accStr + " #[[" + newPageTitle + "]]",
      ""
    );
  }
};

export class CaptureError extends Error {
  statusCode: number | null;
  isRetryable: boolean;
  retryAfterSeconds?: number;
  constructor(message: string, statusCode: number | null, isRetryable: boolean) {
    super(message);
    this.name = "CaptureError";
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
  }
}

export async function appendBlocks(
  graphName: string,
  token: string,
  pageTitle: string | { "daily-note-page": string },
  content: string,
  nestUnder?: string
): Promise<void> {
  const location: Record<string, unknown> = { page: { title: pageTitle } };
  if (nestUnder) {
    location["nest-under"] = { string: nestUnder, open: false };
  }

  let response: Response;
  try {
    response = await fetch(`https://append-api.roamresearch.com/api/graph/${graphName}/append-blocks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        location,
        "append-data": [{ string: content }],
      }),
      signal: AbortSignal.timeout(30000),
    });
  } catch (e) {
    throw new CaptureError(e instanceof Error ? e.message : "Network error", null, true);
  }

  if (!response.ok) {
    // API docs: non-200 responses have {message: "..."} JSON body (except malformed 400s which may return HTML)
    // Read as text first — body stream can only be consumed once
    const rawBody = await response.text().catch(() => "");
    let errorMsg: string;
    try {
      const json = JSON.parse(rawBody);
      errorMsg = json.message || rawBody;
    } catch {
      errorMsg = rawBody;
    }

    const status = response.status;
    if (status === 401) throw new CaptureError(errorMsg || "Invalid token or insufficient permissions.", 401, false);
    if (status === 403) throw new CaptureError(errorMsg || "Insufficient permissions for this graph.", 403, false);
    if (status === 429) {
      const err = new CaptureError(errorMsg || "Rate limited — try again in a minute.", 429, true);
      const retryAfter = response.headers.get("retry-after");
      if (retryAfter) err.retryAfterSeconds = parseInt(retryAfter, 10) || undefined;
      throw err;
    }
    if (status === 413) throw new CaptureError(errorMsg || "Content too large (max 200KB).", 413, false);
    throw new CaptureError(errorMsg || `Append API error ${status}`, status, status >= 500);
  }
}

export async function detectCapabilities(
  graphName: string,
  token: string,
  appendMessage?: string
): Promise<{
  capabilities: { read: boolean; append: boolean; edit: boolean };
  readError?: unknown;
  appendError?: unknown;
}> {
  const message =
    appendMessage ??
    `Graph connected from Raycast on ${roamApiSdk.dateToPageTitle(new Date())} at ${dayjs().format("HH:mm")}`;

  const [readResult, appendResult] = await Promise.allSettled([
    roamApiSdk.q(initRoamBackendClient(graphName, token), "[:find ?e . :where [?e :block/uid]]"),
    appendBlocks(graphName, token, "Raycast", message),
  ]);

  return {
    capabilities: {
      read: readResult.status === "fulfilled",
      append: appendResult.status === "fulfilled",
      edit: readResult.status === "fulfilled" && appendResult.status === "fulfilled",
    },
    readError: readResult.status === "rejected" ? readResult.reason : undefined,
    appendError: appendResult.status === "rejected" ? appendResult.reason : undefined,
  };
}

export async function recheckGraphCapabilities(
  graphConfig: GraphConfig,
  saveGraphConfig: (obj: GraphConfig) => void
): Promise<{ read: boolean; append: boolean; edit: boolean }> {
  const message = `Permissions rechecked from Raycast on ${roamApiSdk.dateToPageTitle(new Date())} at ${dayjs().format(
    "HH:mm"
  )}`;
  const { capabilities } = await detectCapabilities(graphConfig.nameField, graphConfig.tokenField, message);
  saveGraphConfig({ ...graphConfig, capabilities });
  return capabilities;
}

export function processCapture(
  content: string,
  template: string,
  pageTitlesToTagTopBlockWith: string[],
  existingPageTitle?: string,
  nestUnder?: string
): { processedContent: string; pageTitle: string | { "daily-note-page": string }; nestUnder?: string } {
  const tagSuffix = tagPageTitlesStrSuffix(pageTitlesToTagTopBlockWith);
  const templateHadTagsVar = /\{tags}/i.test(template);
  const pageTitle: string | { "daily-note-page": string } = existingPageTitle ?? { "daily-note-page": todayUid() };

  if (template && template.startsWith("- ")) {
    // Template mode: do variable replacement, then let Append API handle nesting
    let processed = template;

    // Replace {date:FORMAT} or {date} — replaceAll + gi to match original behavior
    // {date} defaults to HH:mm for backward compat (legacy name; prefer {time} for new templates)
    processed = processed.replaceAll(/\{date:?([^}]+)?\}/gi, (_match: string, format = "HH:mm") => {
      return dayjs().format(format);
    });

    // {time} — clearer alias, always expands to HH:mm
    processed = processed.replaceAll(/\{time}/gi, dayjs().format("HH:mm"));

    // {today} — expands to today's daily note page as a Roam page ref, e.g. [[April 3rd, 2026]]
    const todayTitle = roamApiSdk.dateToPageTitle(new Date());
    if (todayTitle) {
      processed = processed.replaceAll(/\{today}/gi, `[[${todayTitle}]]`);
    }

    // Replace {content} — when content is multi-line, keep the rest of the template line
    // (e.g. {tags}) on the first content line so tags land on the top block, not the deepest child
    if (content.includes("\n")) {
      processed = processed.replaceAll(/\{content}(.*)/gi, (_match: string, after: string) => {
        const contentLines = content.split("\n");
        return contentLines[0] + after + "\n" + contentLines.slice(1).join("\n");
      });
    } else {
      processed = processed.replaceAll(/\{content}/gi, content);
    }

    // Replace {tags} — uses same #[[tag]] format as tagPageTitlesStrSuffix for consistency
    processed = processed.replaceAll(/\{tags}/gi, tagSuffix.trimStart());

    // Backward compat: the old default template used 1-space-per-level indentation (e.g. "\n - {content}"),
    // and parseTemplate (the old write path) accepted that. The Append API requires at least 2 additional
    // spaces to nest deeper, so 1-space indentation produces siblings instead of children.
    // Users who saved the old default (or wrote similar templates) still have it in their Raycast preferences,
    // so we detect and double all indentation to convert to valid 2-space-per-level format.
    const lines = processed.split("\n");
    const usesOldIndentation = lines.some((line) => /^ - /.test(line));
    if (usesOldIndentation) {
      processed = lines
        .map((line) => {
          const match = line.match(/^( +)(- .*)$/);
          if (match) return " ".repeat(match[1].length * 2) + match[2];
          return line;
        })
        .join("\n");
    }

    // Legacy tag placement: append to first line only when {tags} variable was not used
    if (tagSuffix && !templateHadTagsVar) {
      const firstNewline = processed.indexOf("\n");
      if (firstNewline === -1) {
        processed += tagSuffix;
      } else {
        processed = processed.slice(0, firstNewline) + tagSuffix + processed.slice(firstNewline);
      }
    }

    return { processedContent: processed, pageTitle, nestUnder };
  } else {
    // Simple mode: just the content + tags
    return { processedContent: content + tagSuffix, pageTitle, nestUnder };
  }
}
