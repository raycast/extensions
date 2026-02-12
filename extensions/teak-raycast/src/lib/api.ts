import { environment } from "@raycast/api";
import {
  buildCardsSearchParams,
  DEFAULT_LIMIT,
  RaycastApiError,
  type RaycastApiErrorCode,
  toErrorCode,
} from "./apiErrors";
import {
  getPayloadCode,
  parseCardsResponse,
  parseQuickSaveResponse,
  type CardsResponse,
  type QuickSaveResponse,
} from "./apiParsers";
import { getPreferences } from "./preferences";

export {
  buildCardsSearchParams,
  getRecoveryHint,
  getUserFacingErrorMessage,
  RaycastApiError,
  type RaycastApiErrorCode,
} from "./apiErrors";

export type { RaycastCard } from "./apiParsers";

const DEV_CONVEX_SITE_URL = "https://reminiscent-kangaroo-59.convex.site";
const PROD_CONVEX_SITE_URL = "https://uncommon-ladybug-882.convex.site";

const normalizeUrl = (url: string): string =>
  url.endsWith("/") ? url.slice(0, -1) : url;

const getConvexBaseUrl = (): string =>
  normalizeUrl(
    environment.isDevelopment ? DEV_CONVEX_SITE_URL : PROD_CONVEX_SITE_URL,
  );

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

  return toErrorCode(payloadCode, "REQUEST_FAILED");
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

  try {
    response = await fetch(`${getConvexBaseUrl()}${path}`, {
      ...init,
      headers: buildHeaders(normalizedApiKey, init?.headers),
    });
  } catch {
    throw new RaycastApiError("NETWORK_ERROR");
  }

  if (response.ok) {
    return parseResponse(await parseJson(response));
  }

  const payload = await parseJson(response);

  throw new RaycastApiError(
    getErrorCodeFromResponse(getPayloadCode(payload), response.status),
    response.status,
  );
};

export const quickSaveCard = async (
  content: string,
): Promise<QuickSaveResponse> => {
  return request<QuickSaveResponse>(
    "/api/raycast/quick-save",
    parseQuickSaveResponse,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    },
  );
};

export const searchCards = async (
  query: string,
  limit = DEFAULT_LIMIT,
): Promise<CardsResponse> => {
  return request<CardsResponse>(
    `/api/raycast/search?${buildCardsSearchParams(query, limit)}`,
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
    `/api/raycast/favorites?${buildCardsSearchParams(query, limit)}`,
    parseCardsResponse,
    {
      method: "GET",
    },
  );
};
