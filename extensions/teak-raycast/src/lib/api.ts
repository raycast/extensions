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
  type QuickSaveResponse,
  type RaycastCard,
} from "./apiParsers";
import { getApiBaseUrl } from "./constants";
import { getPreferences } from "./preferences";

export {
  buildCardsSearchParams,
  getRecoveryHint,
  getUserFacingErrorMessage,
  RaycastApiError,
  type RaycastApiErrorCode,
} from "./apiErrors";

export type { RaycastCard } from "./apiParsers";

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
  if (!url.includes("localhost")) {
    return url;
  }

  return url.replace("localhost", "127.0.0.1");
};

const parseJson = async (response: Response): Promise<unknown> => {
  return response.json().catch(() => null);
};

const buildHeaders = (apiKey: string, initHeaders?: HeadersInit): Headers => {
  const headers = new Headers(initHeaders);
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${apiKey}`);
  return headers;
};

export const request = async <T>(
  path: string,
  parseResponse: (payload: unknown) => T,
  init?: RequestInit,
): Promise<T> => {
  const { apiKey } = getPreferences();
  const normalizedApiKey = apiKey?.trim();

  if (!normalizedApiKey) {
    throw new RaycastApiError("MISSING_API_KEY");
  }

  let response: Response;
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
    headers: buildHeaders(normalizedApiKey, init?.headers),
    signal: abortController.signal,
  };

  try {
    response = await fetch(requestUrl, requestInit);
  } catch {
    if (fallbackUrl !== requestUrl) {
      try {
        response = await fetch(fallbackUrl, requestInit);
      } catch {
        throw new RaycastApiError("NETWORK_ERROR");
      }
      // Continue with normal response parsing/error mapping below.
    } else {
      throw new RaycastApiError("NETWORK_ERROR");
    }
  } finally {
    clearTimeout(timeoutHandle);
  }

  if (response.ok) {
    const payload = await parseJson(response);
    return parseResponse(payload);
  }

  const payload = await parseJson(response);
  const payloadCode = getPayloadCode(payload);

  throw new RaycastApiError(
    getErrorCodeFromResponse(payloadCode, response.status),
    response.status,
  );
};

export const quickSaveCard = async (
  content: string,
): Promise<QuickSaveResponse> => {
  return request<QuickSaveResponse>("/cards", parseQuickSaveResponse, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
};

export const searchCards = async (
  query: string,
  limit = DEFAULT_LIMIT,
): Promise<CardsResponse> => {
  return request<CardsResponse>(
    `/cards/search?${buildCardsSearchParams(query, limit)}`,
    parseCardsResponse,
    {
      method: "GET",
    },
  );
};

export const getFavoriteCards = async (
  query: string,
  limit = DEFAULT_LIMIT,
): Promise<CardsResponse> => {
  return request<CardsResponse>(
    `/cards/favorites?${buildCardsSearchParams(query, limit)}`,
    parseCardsResponse,
    {
      method: "GET",
    },
  );
};

export const setCardFavorite = async (
  cardId: string,
  isFavorited: boolean,
): Promise<RaycastCard> => {
  const normalizedCardId = cardId.trim();
  if (!normalizedCardId) {
    throw new RaycastApiError("INVALID_INPUT");
  }

  return request(
    `/cards/${encodeURIComponent(normalizedCardId)}/favorite`,
    parseRaycastCard,
    {
      method: "PATCH",
      body: JSON.stringify({ isFavorited }),
    },
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
