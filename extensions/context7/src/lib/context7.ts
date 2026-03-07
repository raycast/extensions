import { URL } from "node:url";

import { getApiKey } from "./preferences";
import type {
  Context7ErrorPayload,
  ContextCodeSnippet,
  ContextInfoSnippet,
  ContextSearchResponse,
  ContextSnippet,
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

export async function searchLibraries(query: string, signal?: AbortSignal) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const url = new URL("/api/v2/libs/search", API_BASE_URL);
  url.searchParams.set("libraryName", trimmedQuery);
  url.searchParams.set("query", trimmedQuery);

  const response = await requestJson<SearchLibrariesResponse | LibrarySummary[]>(url, signal);
  const libraries = Array.isArray(response) ? response : response.results;

  return Array.isArray(libraries) ? libraries.map(normalizeLibrarySummary) : [];
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

  return normalizeContextSnippets(response);
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
    content: sections.filter(Boolean).join("\n\n"),
    source: snippet.codeId,
  };
}

function normalizeInfoSnippet(snippet: ContextInfoSnippet): ContextSnippet {
  const sections: string[] = [];

  if (snippet.breadcrumb) {
    sections.push(`Section: ${snippet.breadcrumb}`);
  }

  sections.push(snippet.content.trim());

  return {
    title: snippet.breadcrumb || "Documentation Snippet",
    content: sections.filter(Boolean).join("\n\n"),
    source: snippet.pageId,
  };
}

async function requestJson<T>(url: URL, signal?: AbortSignal, redirectCount = 0): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
    signal,
  });

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
        "Invalid Context7 API key. Update the extension preferences.",
        401,
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
      return new Context7ApiError(
        payloadMessage || "Context7 could not process this library.",
        422,
        normalizedPayload?.error,
      );
    case 429:
      return new Context7ApiError(
        retryAfter
          ? `Rate limit exceeded. Retry after ${retryAfter} seconds.`
          : "Rate limit exceeded. Try again later.",
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
      return new Context7ApiError("Context7 is temporarily unavailable. Retry later.", 503, normalizedPayload?.error);
    default:
      return new Context7ApiError(
        payloadMessage || response.statusText || "Context7 request failed.",
        response.status,
        normalizedPayload?.error,
      );
  }
}
