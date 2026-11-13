import type { Genre } from "./genres";

export type BandStatus = "yes" | "no" | "unknown" | "unrecognized";

export interface RelatedVerdict {
  /** The full sentence, e.g. "Blink-182 is punk." */
  line: string;
  /** The linked genre, e.g. "punk". */
  genre: string;
  url: string;
}

export interface BandResult {
  band: string;
  status: BandStatus;
  /** The verdict from the site, e.g. "Sunny Day Real Estate is an emo band." */
  verdict: string;
  /** Optional extra commentary, e.g. "Sorry, to anyone over 30 they're pop-punk." */
  commentary?: string;
  /** A prefilled Twitter compose link from the commentary, when the site offers one. */
  tweetUrl?: string;
  /** A cross-reference to one of the site's sibling genre sites. */
  related?: RelatedVerdict;
  url: string;
}

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const VERDICT_PATTERN = /<div class="results col-xs-12">\s*<h2>([\s\S]*?)<\/h2>/i;
const COMMENTARY_PATTERN = /<div class="col-xs-8 center">\s*<h4>([\s\S]*?)<\/h4>/i;
const RELATED_PATTERN = /<div class="col-xs-12 comment">[\s\S]*?<h5>([\s\S]*?)<\/h5>/i;
const LINK_PATTERN = /<a\b[^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/i;
const TWEET_LINK_PATTERN = /<a\b[^>]*href=['"]([^'"]*(?:twitter\.com|x\.com)[^'"]*)['"][^>]*>\s*Tweet\s*<\/a>/i;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

export function siteUrl(genre: Genre, band: string): string {
  return `https://${genre.domain}/?band=${encodeURIComponent(band.trim())}`;
}

export async function fetchBandResult(genre: Genre, band: string, signal?: AbortSignal): Promise<BandResult> {
  const url = siteUrl(genre, band);
  let response: Response;

  try {
    response = await fetch(url, {
      signal,
      headers: {
        Accept: "text/html",
        "User-Agent": USER_AGENT,
      },
    });
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }

    throw new Error(`Couldn't reach ${genre.domain}. Check your connection and try again.`);
  }

  if (!response.ok) {
    throw new Error(`${genre.siteName} responded with HTTP ${response.status}.`);
  }

  return parseBandPage(await response.text(), genre, band);
}

export function parseBandPage(html: string, genre: Genre, band: string): BandResult {
  const verdict = toText(html.match(VERDICT_PATTERN)?.[1] ?? "");

  if (!verdict) {
    throw new Error("Couldn't find a verdict on the page.");
  }

  const commentaryHtml = html.match(COMMENTARY_PATTERN)?.[1] ?? "";
  const commentary = toText(commentaryHtml);
  const tweetUrl = parseTweetUrl(commentaryHtml);
  const related = parseRelated(html);

  return {
    band,
    status: getStatus(verdict, genre),
    verdict,
    commentary: commentary || undefined,
    tweetUrl,
    related,
    url: siteUrl(genre, band),
  };
}

function getStatus(verdict: string, genre: Genre): BandStatus {
  if (/\bis not in our system\b/i.test(verdict)) {
    return "unknown";
  }

  const genreName = escapeRegExp(genre.name);

  if (new RegExp(`\\bis not an? ${genreName} band\\b`, "i").test(verdict)) {
    return "no";
  }

  if (new RegExp(`\\bis an? ${genreName} band\\b`, "i").test(verdict)) {
    return "yes";
  }

  return "unrecognized";
}

function parseRelated(html: string): RelatedVerdict | undefined {
  const relatedHtml = html.match(RELATED_PATTERN)?.[1] ?? "";
  const line = toText(relatedHtml);
  const link = relatedHtml.match(LINK_PATTERN);

  if (!line || !link) {
    return undefined;
  }

  return {
    line,
    genre: toText(link[2]),
    url: link[1].replace(/^http:\/\//i, "https://"),
  };
}

function parseTweetUrl(html: string): string | undefined {
  const rawUrl = html.match(TWEET_LINK_PATTERN)?.[1];
  return rawUrl ? normalizeTweetUrl(decodeEntities(rawUrl)) : undefined;
}

function normalizeTweetUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const status = url.searchParams.get("status");

    if (url.pathname === "/home" && status) {
      return `https://x.com/intent/post?text=${encodeURIComponent(status.trim())}`;
    }
  } catch {
    // Keep the original URL if it can't be parsed.
  }

  return rawUrl;
}

function toText(html: string): string {
  return decodeEntities(html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] === "#") {
      const isHex = code[1]?.toLowerCase() === "x";
      const value = Number.parseInt(isHex ? code.slice(2) : code.slice(1), isHex ? 16 : 10);
      return Number.isNaN(value) ? entity : String.fromCodePoint(value);
    }

    return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
