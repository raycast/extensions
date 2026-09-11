import { URL } from "node:url";
import { logger } from "@chrismessina/raycast-logger";

import { isAbortError } from "./error-utils";
import { LIBRARY_TOKEN_BUDGET } from "./library-cache";
import { getApiKey } from "./preferences";
import type {
  BrowseDocsResponse,
  Context7ErrorPayload,
  ContextCodeSnippet,
  ContextInfoSnippet,
  ContextSearchResponse,
  ContextSnippet,
  LibrarySearchResult,
  LibrarySummary,
  SearchLibrariesResponse,
} from "./types";

const API_BASE_URL = "https://context7.com";
const MAX_REDIRECTS = 1;

export class Context7ApiError extends Error {
  status: number;
  code?: string;
  retryAfter?: string | null;

  constructor(message: string, status: number, code?: string, retryAfter?: string | null) {
    super(message);
    this.name = "Context7ApiError";
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

/**
 * v2 caps search at 5 results with no way to raise it, so the undocumented v1 route — which
 * returns 30 with an identical schema — is tried first and v2 is the fallback. If v1 ever
 * disappears, search degrades to the documented endpoint rather than breaking.
 */
export async function searchLibraries(query: string, signal?: AbortSignal): Promise<LibrarySearchResult> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return { libraries: [], searchFilterApplied: false, endpoint: "v1" };
  }

  try {
    const result = await searchLibrariesV1(trimmedQuery, signal);

    // Only re-ask v2 when the emptiness is explained by teamspace filtering. Retrying every
    // empty result would double quota consumption on each keystroke of a genuinely unmatched
    // query — and on the free tier that budget is the scarce resource.
    if (result.libraries.length > 0 || !result.searchFilterApplied) {
      logger.log("searchLibraries", {
        query: trimmedQuery,
        endpoint: "v1",
        returned: result.libraries.length,
        searchFilterApplied: result.searchFilterApplied,
      });
      return result;
    }

    logger.log("v1 results were filtered by teamspace policy, retrying on v2", { query: trimmedQuery });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    // Expected whenever the undocumented v1 route is unavailable — routine, not a warning,
    // and `warn` would print even with Verbose Logging switched off.
    logger.log("v1 search unavailable, falling back to v2", error);
  }

  const result = await searchLibrariesV2(trimmedQuery, signal);
  logger.log("searchLibraries", {
    query: trimmedQuery,
    endpoint: "v2",
    returned: result.libraries.length,
    searchFilterApplied: result.searchFilterApplied,
  });

  return result;
}

async function searchLibrariesV1(query: string, signal?: AbortSignal) {
  const url = new URL("/api/v1/search", API_BASE_URL);
  url.searchParams.set("query", query);

  return toSearchResult(await requestJson<SearchLibrariesResponse | LibrarySummary[]>(url, signal), "v1");
}

async function searchLibrariesV2(query: string, signal?: AbortSignal) {
  const url = new URL("/api/v2/libs/search", API_BASE_URL);
  url.searchParams.set("libraryName", query);
  url.searchParams.set("query", query);

  return toSearchResult(await requestJson<SearchLibrariesResponse | LibrarySummary[]>(url, signal), "v2");
}

function toSearchResult(
  response: SearchLibrariesResponse | LibrarySummary[],
  endpoint: "v1" | "v2",
): LibrarySearchResult {
  if (Array.isArray(response)) {
    return { libraries: response.map(normalizeLibrarySummary), searchFilterApplied: false, endpoint };
  }

  // v1 is undocumented and answers some failures with a 200 and a plain-text body, which
  // arrives here as a string rather than an object with `results`.
  if (!Array.isArray(response?.results)) {
    throw new Context7ApiError(`${endpoint} search returned an unrecognized payload.`, 200);
  }

  return {
    libraries: response.results.map(normalizeLibrarySummary),
    searchFilterApplied: response.searchFilterApplied === true,
    endpoint,
  };
}

export async function searchContext(libraryId: string, query: string, signal?: AbortSignal) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const url = new URL("/api/v2/context", API_BASE_URL);
  url.searchParams.set("libraryId", libraryId);
  url.searchParams.set("query", trimmedQuery);
  url.searchParams.set("type", "json");

  const response = await requestJson<ContextSearchResponse | ContextSnippet[]>(url, signal);

  if (Array.isArray(response)) {
    return response;
  }

  const snippets = normalizeContextSnippets(response);

  logger.log("searchContext", {
    libraryId,
    query: trimmedQuery,
    code: response.codeSnippets?.length ?? 0,
    docs: response.infoSnippets?.length ?? 0,
    hasRules: Boolean(response.rules),
  });

  return snippets;
}

/**
 * v2 requires a query and reranks everything against it, so there is no way to ask it "show me
 * this library". The undocumented v1 docs route needs no query, which is what makes an initial
 * browsable view possible at all. Code snippets only — v1 has no prose half.
 */
export async function browseLibraryDocs(libraryId: string, signal?: AbortSignal) {
  const url = new URL(`/api/v1${libraryId}`, API_BASE_URL);
  url.searchParams.set("type", "json");
  url.searchParams.set("tokens", String(LIBRARY_TOKEN_BUDGET));

  const response = await requestJson<BrowseDocsResponse>(url, signal);

  if (!Array.isArray(response?.snippets)) {
    throw new Context7ApiError("Browsing is unavailable for this library.", 200);
  }

  const snippets = response.snippets.map(normalizeCodeSnippet);
  logger.log("browseLibraryDocs", { libraryId, returned: snippets.length });

  return snippets;
}

function normalizeLibrarySummary(library: LibrarySummary) {
  return {
    ...library,
    name: library.name || library.title || library.id,
  };
}

function normalizeContextSnippets(response: ContextSearchResponse) {
  const codeSnippets = (response.codeSnippets ?? []).map(normalizeCodeSnippet);
  const infoSnippets = (response.infoSnippets ?? []).map(normalizeInfoSnippet);

  return [...codeSnippets, ...infoSnippets];
}

function normalizeCodeSnippet(snippet: ContextCodeSnippet): ContextSnippet {
  const sections: string[] = [];

  if (snippet.codeDescription) {
    sections.push(snippet.codeDescription.trim());
  }

  for (const codeBlock of snippet.codeList ?? []) {
    const language = codeBlock.language?.trim() || snippet.codeLanguage?.trim() || "";
    sections.push(["```" + language, codeBlock.code.trim(), "```"].join("\n"));
  }

  return {
    title: snippet.codeTitle || snippet.pageTitle || "Code Snippet",
    // Context7 reuses codeTitle constantly — one library returns "Basic example" a dozen
    // times. The description is what actually distinguishes them, and the page title or
    // source anchor identifies where it came from when there is no description.
    subtitle: toSubtitle(snippet.codeDescription, snippet.pageTitle, snippet.codeId),
    content: sections.filter(Boolean).join("\n\n"),
    source: snippet.codeId,
    kind: "code",
  };
}

const MAX_SUBTITLE_LENGTH = 90;

/** Prefers the human description, then the page it came from, then the source file name. */
function toSubtitle(description?: string, pageTitle?: string, source?: string) {
  const described = description?.trim().replace(/\s+/g, " ");

  if (described) {
    // Sliced by code POINT, not code unit: a fixed UTF-16 slice can cut an emoji in half and
    // render a replacement glyph.
    const characters = [...described];

    return characters.length > MAX_SUBTITLE_LENGTH
      ? `${characters
          .slice(0, MAX_SUBTITLE_LENGTH - 1)
          .join("")
          .trimEnd()}…`
      : described;
  }

  // "Unknown" is Context7's own placeholder for a page it could not name.
  if (pageTitle && pageTitle.trim() && pageTitle.trim() !== "Unknown") {
    return pageTitle.trim();
  }

  return sourceLabel(source);
}

/** The file the snippet came from, e.g. ".../docs/transition.mdx#_snippet_3" → "transition.mdx". */
function sourceLabel(source?: string) {
  if (!source) {
    return undefined;
  }

  const withoutAnchor = source.split("#")[0];
  const fileName = withoutAnchor.split("/").filter(Boolean).at(-1);

  // A fragment-only source ("#_snippet_3") leaves nothing before the anchor; fall back to the
  // fragment rather than returning undefined, since disambiguation is the whole point here.
  return fileName || source.split("#")[1] || undefined;
}

function normalizeInfoSnippet(snippet: ContextInfoSnippet): ContextSnippet {
  const sections: string[] = [];

  if (snippet.breadcrumb) {
    sections.push(`Section: ${snippet.breadcrumb}`);
  }

  sections.push(snippet.content.trim());

  return {
    title: snippet.breadcrumb || "Documentation Snippet",
    subtitle: toSubtitle(undefined, undefined, snippet.pageId),
    content: sections.filter(Boolean).join("\n\n"),
    source: snippet.pageId,
    kind: "docs",
  };
}

async function requestJson<T>(url: URL, signal?: AbortSignal, redirectCount = 0): Promise<T> {
  const apiKey = getApiKey();
  const startedAt = Date.now();

  // `authenticated`, not `auth` — the latter is in the logger's credential-key set and would
  // print as "***" regardless of its value.
  logger.log(`→ GET ${url.pathname}`, {
    params: Object.fromEntries(url.searchParams),
    authenticated: Boolean(apiKey),
    ...(redirectCount > 0 ? { redirectCount } : {}),
  });

  const response = await fetch(url, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    signal,
  });

  logResponse(url, response, Date.now() - startedAt);

  const payload = await parsePayload(response);

  if (response.status === 202) {
    throw toContext7ApiError(response, payload);
  }

  if (response.status === 301 && redirectCount < MAX_REDIRECTS) {
    const redirectUrl = getRedirectUrl(payload);

    if (redirectUrl) {
      return requestJson(new URL(redirectUrl, API_BASE_URL), signal, redirectCount + 1);
    }
  }

  if (!response.ok) {
    throw toContext7ApiError(response, payload);
  }

  return payload as T;
}

async function parsePayload(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as unknown;
  }

  return await response.text();
}

function getRedirectUrl(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const redirectUrl = (payload as Context7ErrorPayload).redirectUrl;
  return typeof redirectUrl === "string" && redirectUrl.length > 0 ? redirectUrl : undefined;
}

/** The anonymous quota is small, so a rate-limited anonymous user is told the fix rather than just the failure. */
function buildRateLimitMessage(response: Response, retryAfter: string | null) {
  const isAnonymous = response.headers.get("context7-quota-tier") === "anonymous";

  if (isAnonymous) {
    return "Anonymous request limit reached. Add a Context7 API key in the extension preferences to raise it.";
  }

  return retryAfter
    ? `Rate limit exceeded. Retry after ${retryAfter} seconds.`
    : "Rate limit exceeded. Try again later.";
}

/**
 * One line per response carrying everything needed to diagnose a bad search from a log alone:
 * which endpoint answered, how long it took, and the quota headers Context7 returns on success
 * as well as failure. The API key lives in a header and is never logged.
 */
function logResponse(url: URL, response: Response, durationMs: number) {
  const remaining = response.headers.get("ratelimit-remaining");

  logger.log(`← ${response.status} ${url.pathname}`, {
    ms: durationMs,
    contentType: response.headers.get("content-type") ?? "unknown",
    ...(remaining === null
      ? {}
      : {
          tier: response.headers.get("context7-quota-tier") ?? "unknown",
          quota: `${remaining}/${response.headers.get("ratelimit-limit") ?? "?"}`,
        }),
    ...(response.headers.get("retry-after") ? { retryAfter: response.headers.get("retry-after") } : {}),
  });
}

function toContext7ApiError(response: Response, payload: unknown) {
  const retryAfter = response.headers.get("retry-after");
  const normalizedPayload = payload && typeof payload === "object" ? (payload as Context7ErrorPayload) : undefined;
  const payloadMessage = normalizedPayload?.message || normalizedPayload?.error;

  switch (response.status) {
    case 202:
      return new Context7ApiError(
        "This library is still being finalized. Try again shortly.",
        202,
        normalizedPayload?.error,
      );
    case 301:
      return new Context7ApiError(
        "This library moved and Context7 did not provide a usable redirect.",
        301,
        normalizedPayload?.error,
      );
    case 401:
      return new Context7ApiError(
        "Invalid Context7 API key. Update it in the extension preferences.",
        401,
        normalizedPayload?.error,
      );
    case 402:
      return new Context7ApiError(
        payloadMessage || "Context7 spending limit reached. Check your plan on context7.com.",
        402,
        normalizedPayload?.error,
      );
    case 403:
      return new Context7ApiError(
        payloadMessage || "Access to this library is forbidden.",
        403,
        normalizedPayload?.error,
      );
    case 404:
      return new Context7ApiError(
        payloadMessage || "The requested library or snippet was not found.",
        404,
        normalizedPayload?.error,
      );
    case 422:
      // Permanent, unlike 202 — the library is too large or carries no indexable code.
      return new Context7ApiError(
        payloadMessage || "Context7 cannot serve this library's documentation.",
        422,
        normalizedPayload?.error,
      );
    case 429:
      return new Context7ApiError(
        buildRateLimitMessage(response, retryAfter),
        429,
        normalizedPayload?.error,
        retryAfter,
      );
    case 500:
      return new Context7ApiError(
        "Context7 returned an internal server error. Retry shortly.",
        500,
        normalizedPayload?.error,
      );
    case 503:
    case 504:
      return new Context7ApiError(
        "Context7 is temporarily unavailable. Retry shortly.",
        response.status,
        normalizedPayload?.error,
      );
    default:
      return new Context7ApiError(
        payloadMessage || response.statusText || "Context7 request failed.",
        response.status,
        normalizedPayload?.error,
      );
  }
}
