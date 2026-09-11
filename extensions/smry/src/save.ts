import { captureRenderedPage, getHostname, isSupportedArticleUrl, type SaveDestination } from "./smry";

export const LIBRARY_ENDPOINT = "https://api.smry.ai/v1/library/items";
export const MAX_API_CONTENT_CHARACTERS = 2_000_000;
export const API_TIMEOUT_MS = 10_000;

const LINK_ONLY_SNAPSHOT = {
  ok: false,
  detail: "No rendered browser tab was available; smry will retrieve the public URL.",
} as const;

type SaveApiErrorPayload = {
  error?: unknown;
  message?: unknown;
};

type SaveApiResponse = {
  alreadySaved?: unknown;
};

export type SaveResult = {
  destination: SaveDestination;
  captured: boolean;
  alreadySaved: boolean;
  fallbackDetail?: string;
};

export class SmrySaveError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "SmrySaveError";
  }
}

function safeTitle(title: string | undefined, articleUrl: string): string {
  return title?.trim().slice(0, 500) || getHostname(articleUrl) || articleUrl;
}

function apiErrorMessage(status: number, payload: SaveApiErrorPayload | null): string {
  const detail =
    typeof payload?.error === "string" ? payload.error : typeof payload?.message === "string" ? payload.message : null;
  if (status === 401) return "Check the smry API key in extension settings.";
  if (status === 403) return "This smry API key cannot save Library items.";
  if (status === 429) return "smry is receiving too many saves. Try again shortly.";
  return detail?.slice(0, 240) || `smry returned HTTP ${status}.`;
}

async function saveWithApi(params: {
  url: string;
  title: string;
  destination: SaveDestination;
  apiKey: string;
  tabId?: number;
  getContent?: (options: { tabId: number; format: "html" }) => Promise<string>;
  fetchImpl: typeof fetch;
  timeoutMs: number;
}): Promise<SaveResult> {
  const capturedPage =
    typeof params.tabId === "number" && params.getContent
      ? await captureRenderedPage({ tabId: params.tabId, getContent: params.getContent })
      : LINK_ONLY_SNAPSHOT;
  const canSendRenderedPage = capturedPage.ok && capturedPage.html.length <= MAX_API_CONTENT_CHARACTERS;
  const body = {
    url: params.url,
    title: params.title,
    status: params.destination,
    captureMethod: "extension",
    ...(canSendRenderedPage ? { content: capturedPage.html, format: "html" } : {}),
  };

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), params.timeoutMs);
  let response: Response;
  let payload: (SaveApiResponse & SaveApiErrorPayload) | null;
  try {
    response = await params.fetchImpl(LIBRARY_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: abortController.signal,
    });
    payload = (await response.json().catch(() => null)) as (SaveApiResponse & SaveApiErrorPayload) | null;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new SmrySaveError("The smry save timed out. Try again.");
    }
    throw new SmrySaveError(error instanceof Error ? error.message : "Could not reach smry.");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) throw new SmrySaveError(apiErrorMessage(response.status, payload), response.status);

  const fallbackDetail = capturedPage.ok
    ? canSendRenderedPage
      ? undefined
      : `Rendered HTML exceeded ${MAX_API_CONTENT_CHARACTERS.toLocaleString()} characters; smry retrieved the public URL.`
    : capturedPage.detail;
  return {
    destination: params.destination,
    captured: canSendRenderedPage,
    alreadySaved: payload?.alreadySaved === true,
    fallbackDetail,
  };
}

export async function saveArticle(params: {
  url: string;
  title?: string;
  destination: SaveDestination;
  apiKey: string;
  tabId?: number;
  getContent?: (options: { tabId: number; format: "html" }) => Promise<string>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Promise<SaveResult> {
  if (!isSupportedArticleUrl(params.url)) {
    throw new SmrySaveError("Choose a public HTTP or HTTPS link.");
  }

  const title = safeTitle(params.title, params.url);
  const apiKey = params.apiKey.trim();
  if (!apiKey) throw new SmrySaveError("Add a smry API key in extension settings.");
  return saveWithApi({
    ...params,
    title,
    apiKey,
    fetchImpl: params.fetchImpl ?? fetch,
    timeoutMs: params.timeoutMs ?? API_TIMEOUT_MS,
  });
}
