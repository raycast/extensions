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

export type CardSearchInput = {
  createdAfter?: number;
  createdBefore?: number;
  favorited?: boolean;
  limit?: number;
  query?: string;
  sort?: RaycastSort;
  tag?: string;
  type?: RaycastCardType;
};

export type CreateCardInput = {
  content?: string;
  notes?: string | null;
  source?: string;
  tags?: string[];
  url?: string;
};

export type UpdateCardInput = {
  content?: string;
  notes?: string | null;
  tags?: string[];
  url?: string;
};

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

export const createCard = async (
  input: CreateCardInput,
): Promise<QuickSaveResponse> => {
  return request<QuickSaveResponse>("/cards", parseQuickSaveResponse, {
    body: JSON.stringify(input),
    method: "POST",
  });
};

export const quickSaveCard = async (
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

export const searchCards = async (
  input: CardSearchInput = {},
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
  );
};

export const getFavoriteCards = async (
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

export const getCardById = async (cardId: string): Promise<RaycastCard> => {
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
  );
};

export const updateCard = async (
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
      body: JSON.stringify({ isFavorited }),
      method: "PATCH",
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

export const listTags = async (): Promise<TagsResponse> => {
  return request<TagsResponse>("/tags", parseTagsResponse, {
    method: "GET",
  });
};
