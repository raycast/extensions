import { load } from "cheerio";
import { fetchText } from "../../lib/http";
import type {
  SearchContext,
  SearchProvider,
  WorkKind,
  WorkResult,
} from "../../types";
import { CATALOG_MIRROR_GROUPS } from "./config";

type AvailableMirror = { baseUrl: string; groupId: CatalogMirrorGroupId };
type CatalogMirrorGroupId = (typeof CATALOG_MIRROR_GROUPS)[number]["id"];
let mirrorCache: { expiresAt: number; mirrors: AvailableMirror[] } | undefined;

export const catalogMirrorsProvider: SearchProvider = {
  id: "catalog-mirrors",
  name: "External Catalog Mirrors",
  handlesFallbackQueries: true,
  async search(query, context) {
    const available = await discoverAvailableMirrors(context);
    const requestedKind: WorkKind =
      context.advanced?.kind === "article"
        ? "article"
        : context.advanced?.kind === "book"
          ? "book"
          : "other";
    const groupedResults = await Promise.all(
      CATALOG_MIRROR_GROUPS.map(async (group) => {
        const bases = uniqueBases([
          ...available
            .filter((mirror) => mirror.groupId === group.id)
            .map((mirror) => mirror.baseUrl),
          ...group.fallbackBases,
        ]);
        const primary = await searchGroup(
          group,
          bases,
          query,
          requestedKind,
          context.signal,
        );
        if (primary.length) return primary;
        for (const fallback of context.fallbackQueries ?? []) {
          const fallbackResults = await searchGroup(
            group,
            bases,
            fallback,
            requestedKind,
            context.signal,
          );
          if (fallbackResults.length) return fallbackResults;
        }
        return [];
      }),
    );
    return groupedResults.flat();
  },
};

async function searchGroup(
  group: (typeof CATALOG_MIRROR_GROUPS)[number],
  bases: string[],
  query: string,
  requestedKind: WorkKind,
  signal: AbortSignal,
): Promise<WorkResult[]> {
  const settled = await Promise.all(
    bases.map(async (baseUrl) => {
      try {
        const html = await fetchMirrorText(
          `${baseUrl}${group.searchPath(query)}`,
          signal,
        );
        return group.id === "annas-archive"
          ? parseAnnasArchive(html, baseUrl, requestedKind)
          : parseLibraryGenesis(html, baseUrl, requestedKind);
      } catch {
        return [];
      }
    }),
  );
  return settled.flat();
}

async function fetchMirrorText(
  url: string,
  signal: AbortSignal,
): Promise<string> {
  const controller = new AbortController();
  const forwardAbort = () => controller.abort(signal.reason);
  const timeout = setTimeout(
    () => controller.abort(new Error("Catalog mirror timed out")),
    4_000,
  );
  if (signal.aborted) forwardAbort();
  else signal.addEventListener("abort", forwardAbort, { once: true });
  try {
    return await fetchText(url, controller.signal, {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 Safari/537.36",
    });
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", forwardAbort);
  }
}

async function discoverAvailableMirrors(
  context: SearchContext,
): Promise<AvailableMirror[]> {
  if (mirrorCache && mirrorCache.expiresAt > Date.now())
    return mirrorCache.mirrors;
  try {
    const html = await fetchText("https://open-slum.org/", context.signal, {
      Accept: "text/html",
    });
    const $ = load(html);
    const mirrors = $("li.domain-item-dense")
      .filter(
        (_, element) =>
          $(element).find(".status-badge.up, .status-badge.degraded").length >
          0,
      )
      .map((_, element) => {
        const href = $(element).find("a.domain-link").attr("href");
        const statusHref = $(element)
          .find("a.status-badge.up, a.status-badge.degraded")
          .attr("href");
        const group = CATALOG_MIRROR_GROUPS.find((candidate) =>
          statusHref?.startsWith(candidate.slumStatusPage),
        );
        if (!href || !group) return undefined;
        try {
          const url = new URL(href);
          if (url.protocol !== "https:") return undefined;
          return { baseUrl: url.origin, groupId: group.id };
        } catch {
          return undefined;
        }
      })
      .get()
      .filter((mirror): mirror is AvailableMirror => Boolean(mirror));
    mirrorCache = { mirrors, expiresAt: Date.now() + 5 * 60 * 1000 };
    return mirrors;
  } catch {
    return [];
  }
}

function parseAnnasArchive(
  html: string,
  baseUrl: string,
  requestedKind: WorkKind,
): WorkResult[] {
  const $ = load(html.replaceAll(/<!--|-->/g, ""));
  const seen = new Set<string>();
  const results: WorkResult[] = [];

  $("a[href^='/md5/'].js-vim-focus, a[href^='/md5/']").each((_, element) => {
    if (results.length >= 12) return false;
    const href = $(element).attr("href");
    const md5 = href?.split("/").filter(Boolean).pop();
    const title = $(element).text().replace(/\s+/g, " ").trim();
    if (!href || !md5 || !title || seen.has(md5)) return;
    seen.add(md5);

    const author = $(element).next().text().replace(/\s+/g, " ").trim();
    const publisher = $(element)
      .next()
      .next()
      .text()
      .replace(/\s+/g, " ")
      .trim();
    const coverPath = $(element)
      .parent()
      .parent()
      .parent()
      .find("img")
      .first()
      .attr("src");
    const source = `Anna's Archive Catalog (${new URL(baseUrl).hostname})`;
    results.push({
      id: `annas-catalog:${md5}`,
      title,
      authors: author && author.toLowerCase() !== "unknown" ? [author] : [],
      publisher:
        publisher && publisher.toLowerCase() !== "unknown"
          ? publisher
          : undefined,
      kind: requestedKind,
      coverUrl: toAbsoluteUrl(coverPath, baseUrl),
      identifiers: { other: [`md5:${md5}`] },
      citation: { url: new URL(href, baseUrl).href },
      sources: [source],
      accessLinks: [
        {
          label: `Open Bibliographic Record — ${new URL(baseUrl).hostname}`,
          url: new URL(href, baseUrl).href,
          source,
          kind: "record",
        },
      ],
    });
  });

  return results;
}

function parseLibraryGenesis(
  html: string,
  baseUrl: string,
  requestedKind: WorkKind,
): WorkResult[] {
  const $ = load(html);
  const seen = new Set<string>();
  const results: WorkResult[] = [];

  $("a[href^='edition.php?id='], a[href^='/edition.php?id=']").each(
    (_, element) => {
      if (results.length >= 12) return false;
      const href = $(element).attr("href");
      const id = href?.match(/[?&]id=(\d+)/)?.[1];
      const title = $(element)
        .clone()
        .find("i")
        .remove()
        .end()
        .text()
        .replace(/\s+/g, " ")
        .trim();
      if (!href || !id || !title || seen.has(id)) return;
      seen.add(id);

      const row = $(element).closest("tr");
      const cells = row.find("td");
      const author = cells.eq(2).text().replace(/\s+/g, " ").trim();
      const publisher = cells.eq(3).text().replace(/\s+/g, " ").trim();
      const yearText = cells.eq(4).text().trim();
      const language = cells.eq(6).text().replace(/\s+/g, " ").trim();
      const doi = row
        .text()
        .match(/\bDOI:\s*(10\.\d{4,9}\/[^\s]+)/i)?.[1]
        ?.replace(/[),.;]+$/, "")
        .toLowerCase();
      const containerTitle = cells
        .eq(1)
        .find("a[href^='series.php?id=']")
        .first()
        .text()
        .replace(/\s+/g, " ")
        .trim();
      const recordUrl = new URL(href, baseUrl).href;
      const source = `Library Genesis Catalog (${new URL(baseUrl).hostname})`;
      results.push({
        id: `libgen-catalog:${id}`,
        title,
        authors: author ? [author] : [],
        year: /^\d{4}$/.test(yearText) ? Number(yearText) : undefined,
        publisher: publisher || undefined,
        kind: requestedKind === "article" ? "article" : "book",
        languages: language ? [language] : undefined,
        identifiers: { doi, other: [`libgen-edition:${id}`] },
        citation: {
          containerTitle: containerTitle || undefined,
          url: recordUrl,
        },
        sources: [source],
        accessLinks: [
          {
            label: `Open Bibliographic Record — ${new URL(baseUrl).hostname}`,
            url: recordUrl,
            source,
            kind: "record",
          },
        ],
      });
    },
  );

  return results;
}

function uniqueBases(values: string[]): string[] {
  return [...new Set(values.map((value) => value.replace(/\/$/, "")))];
}

function toAbsoluteUrl(
  value: string | undefined,
  baseUrl: string,
): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return undefined;
  }
}

export { CATALOG_MIRROR_GROUPS } from "./config";
