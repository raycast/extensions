import { environment } from "@raycast/api";
import {
  buildCardsSearchParams,
  DEFAULT_LIMIT,
  RaycastApiError,
  type RaycastApiErrorCode,
  toErrorCode,
} from "./apiErrors";
import {
  type CardsResponse,
  getPayloadCode,
  parseCardsResponse,
  parseQuickSaveResponse,
  parseRaycastCard,
  parseTagsResponse,
  type QuickSaveResponse,
  type RaycastCard,
  type TagsResponse,
} from "./apiParsers";
import { getApiBaseUrl } from "./constants";
import {
  authorizeTeak,
  getStoredTeakAccessToken,
  reauthorizeTeak,
} from "./oauth";
import { getPreferences } from "./preferences";
import type { RaycastCardType, RaycastSort } from "./searchFilters";

export {
  buildCardsSearchParams,
  getRecoveryHint,
  getUserFacingErrorMessage,
  RaycastApiError,
  type RaycastApiErrorCode,
} from "./apiErrors";

export type { RaycastCard } from "./apiParsers";
export type { TagSummary, TagsResponse } from "./apiParsers";

export interface CardSearchInput {
  createdAfter?: number;
  createdBefore?: number;
  favorited?: boolean;
  limit?: number;
  query?: string;
  sort?: RaycastSort;
  tag?: string;
  type?: RaycastCardType;
}

export interface CreateCardInput {
  content?: string;
  notes?: string | null;
  source?: string;
  tags?: string[];
  url?: string;
}

export interface UpdateCardInput {
  content?: string;
  notes?: string | null;
  tags?: string[];
  url?: string;
}

const getErrorCodeFromResponse = (
  payloadCode: string | undefined,
  status: number,
): RaycastApiErrorCode => {
  if (status === 401) {
    return toErrorCode(payloadCode, "INVALID_API_KEY");
  }

  if (status === 429) {
    return "RATE_LIMITED";
  }

  if (status === 404) {
    return toErrorCode(payloadCode, "NOT_FOUND");
  }

  return toErrorCode(payloadCode, "REQUEST_FAILED");
};

const isMissingDevApiGatewayResponse = (
  response: Response,
  payload: unknown,
  requestUrl: string,
): boolean => {
  if (!environment.isDevelopment || response.status !== 404 || payload) {
    return false;
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(requestUrl);
  } catch {
    return false;
  }

  return (
    parsedUrl.hostname === "api.teak.localhost" &&
    response.headers.get("x-portless") === "1" &&
    !response.headers.get("content-type")?.includes("application/json")
  );
};

const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

const getRequestTimeoutMs = (): number => {
  const rawValue = process.env.TEAK_API_REQUEST_TIMEOUT_MS;
  if (!rawValue) {
    return DEFAULT_REQUEST_TIMEOUT_MS;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_REQUEST_TIMEOUT_MS;
  }

  return parsed;
};

const withLoopbackFallback = (url: string): string => {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return url;
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  if (hostname !== "localhost" && !hostname.endsWith(".localhost")) {
    return url;
  }

  parsedUrl.hostname = "127.0.0.1";
  return parsedUrl.toString();
};

const parseJson = (response: Response): Promise<unknown> => {
  return response.json().catch(() => null);
};

const buildHeaders = (apiKey: string, initHeaders?: HeadersInit): Headers => {
  const headers = new Headers(initHeaders);
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${apiKey}`);
  return headers;
};

const logApiRequestFailure = (
  context: Record<string, unknown>,
  error?: unknown,
) => {
  console.error("[Teak Raycast] API request failed", {
    ...context,
    error:
      error instanceof Error
        ? {
            message: error.message,
            name: error.name,
          }
        : error,
  });
};

interface ResolvedBearer {
  source: "apiKey" | "oauth";
  token: string;
}

// When `interactive` is false (background / no-view commands), auth is resolved
// only from an API key or an existing/refreshable OAuth session — the browser
// sign-in overlay is never opened.
export interface RequestAuthOptions {
  interactive?: boolean;
}

// Grandfathered API keys take precedence over browser sign-in. When no key is
// configured, fall back to OAuth. Interactive callers may open the browser
// sign-in overlay; non-interactive callers resolve from a stored/refreshable
// session only and fail (rather than prompting) when none is available.
const resolveBearerToken = async (
  options?: RequestAuthOptions,
): Promise<ResolvedBearer> => {
  const apiKey = getPreferences().apiKey?.trim();
  if (apiKey) {
    return { source: "apiKey", token: apiKey };
  }

  if (options?.interactive === false) {
    const storedToken = await getStoredTeakAccessToken();
    if (!storedToken) {
      throw new RaycastApiError("INVALID_API_KEY", 401);
    }
    return { source: "oauth", token: storedToken };
  }

  const accessToken = await authorizeTeak();
  return { source: "oauth", token: accessToken };
};

const executeHttpRequest = async (
  path: string,
  bearerToken: string,
  init?: RequestInit,
): Promise<{ requestUrl: string; response: Response }> => {
  const baseUrl = getApiBaseUrl();
  const timeoutMs = getRequestTimeoutMs();
  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => {
    abortController.abort(new Error(`Request timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  const requestUrl = `${baseUrl}${path}`;
  const fallbackUrl = withLoopbackFallback(requestUrl);
  const requestInit: RequestInit = {
    ...init,
    headers: buildHeaders(bearerToken, init?.headers),
    signal: abortController.signal,
  };

  try {
    return { requestUrl, response: await fetch(requestUrl, requestInit) };
  } catch (requestError) {
    if (fallbackUrl !== requestUrl) {
      try {
        return {
          requestUrl,
          response: await fetch(fallbackUrl, requestInit),
        };
      } catch (fallbackError) {
        logApiRequestFailure(
          {
            fallbackUrl,
            method: requestInit.method ?? "GET",
            path,
            url: requestUrl,
          },
          fallbackError,
        );
        throw new RaycastApiError("NETWORK_ERROR");
      }
    }

    logApiRequestFailure(
      {
        method: requestInit.method ?? "GET",
        path,
        url: requestUrl,
      },
      requestError,
    );
    throw new RaycastApiError("NETWORK_ERROR");
  } finally {
    clearTimeout(timeoutHandle);
  }
};

export const request = async <T>(
  path: string,
  parseResponse: (payload: unknown) => T,
  init?: RequestInit,
  options?: RequestAuthOptions,
): Promise<T> => {
  const bearer = await resolveBearerToken(options);
  let { requestUrl, response } = await executeHttpRequest(
    path,
    bearer.token,
    init,
  );

  // An OAuth access token can be revoked or rotated server-side. Interactive
  // callers drop the cached tokens, re-authorize once, and retry. Non-interactive
  // callers (no-view commands) must not open the sign-in overlay, so they
  // surface the error instead of re-authorizing.
  if (
    response.status === 401 &&
    bearer.source === "oauth" &&
    options?.interactive !== false
  ) {
    const refreshedToken = await reauthorizeTeak();
    ({ requestUrl, response } = await executeHttpRequest(
      path,
      refreshedToken,
      init,
    ));
  }

  if (response.ok) {
    const payload = await parseJson(response);
    return parseResponse(payload);
  }

  const payload = await parseJson(response);
  const payloadCode = getPayloadCode(payload);
  const code = isMissingDevApiGatewayResponse(response, payload, requestUrl)
    ? "DEV_API_UNAVAILABLE"
    : getErrorCodeFromResponse(payloadCode, response.status);

  logApiRequestFailure({
    code,
    contentType: response.headers.get("content-type"),
    method: init?.method ?? "GET",
    path,
    payload,
    payloadCode,
    status: response.status,
    statusText: response.statusText,
    url: response.url || requestUrl,
    xPortless: response.headers.get("x-portless"),
  });

  throw new RaycastApiError(code, response.status);
};

export const createCard = (
  input: CreateCardInput,
  options?: RequestAuthOptions,
): Promise<QuickSaveResponse> => {
  return request<QuickSaveResponse>(
    "/cards",
    parseQuickSaveResponse,
    {
      body: JSON.stringify(input),
      method: "POST",
    },
    options,
  );
};

export const quickSaveCard = (
  input: string | CreateCardInput,
): Promise<QuickSaveResponse> => {
  return createCard(
    typeof input === "string"
      ? {
          content: input,
        }
      : input,
  );
};

export const searchCards = (
  input: CardSearchInput = {},
  options?: RequestAuthOptions,
): Promise<CardsResponse> => {
  return request<CardsResponse>(
    `/cards/search?${buildCardsSearchParams({
      ...input,
      limit: input.limit ?? DEFAULT_LIMIT,
    })}`,
    parseCardsResponse,
    {
      method: "GET",
    },
    options,
  );
};

export const getFavoriteCards = (
  input: CardSearchInput = {},
): Promise<CardsResponse> => {
  return request<CardsResponse>(
    `/cards/favorites?${buildCardsSearchParams({
      ...input,
      limit: input.limit ?? DEFAULT_LIMIT,
    })}`,
    parseCardsResponse,
    {
      method: "GET",
    },
  );
};

export const getCardById = (
  cardId: string,
  options?: RequestAuthOptions,
): Promise<RaycastCard> => {
  const normalizedCardId = cardId.trim();
  if (!normalizedCardId) {
    throw new RaycastApiError("INVALID_INPUT");
  }

  return request(
    `/cards/${encodeURIComponent(normalizedCardId)}`,
    parseRaycastCard,
    {
      method: "GET",
    },
    options,
  );
};

export const updateCard = (
  cardId: string,
  input: UpdateCardInput,
): Promise<RaycastCard> => {
  const normalizedCardId = cardId.trim();
  if (!normalizedCardId) {
    throw new RaycastApiError("INVALID_INPUT");
  }

  return request(
    `/cards/${encodeURIComponent(normalizedCardId)}`,
    parseRaycastCard,
    {
      body: JSON.stringify(input),
      method: "PATCH",
    },
  );
};

export const setCardFavorite = (
  cardId: string,
  isFavorited: boolean,
  options?: RequestAuthOptions,
): Promise<RaycastCard> => {
  const normalizedCardId = cardId.trim();
  if (!normalizedCardId) {
    throw new RaycastApiError("INVALID_INPUT");
  }

  return request(
    `/cards/${encodeURIComponent(normalizedCardId)}/favorite`,
    parseRaycastCard,
    {
      body: JSON.stringify({ isFavorited }),
      method: "PATCH",
    },
    options,
  );
};

export const softDeleteCard = async (cardId: string): Promise<void> => {
  const normalizedCardId = cardId.trim();
  if (!normalizedCardId) {
    throw new RaycastApiError("INVALID_INPUT");
  }

  await request<void>(
    `/cards/${encodeURIComponent(normalizedCardId)}`,
    () => undefined,
    {
      method: "DELETE",
    },
  );
};

export const listTags = (
  options?: RequestAuthOptions,
): Promise<TagsResponse> => {
  return request<TagsResponse>(
    "/tags",
    parseTagsResponse,
    {
      method: "GET",
    },
    options,
  );
};
