/**
 * API Client with timeout, safe GET retry logic, and proper error handling
 */

import { getPreferenceValues } from "@raycast/api";
import { API_CONFIG, SECURITY_HEADERS } from "../constants";
import { ApiError, handleError, isRetryableError } from "../utils/error-handler";
import { sanitizeUrl } from "../utils/security";
import type { ApiErrorResponse } from "../types";

/**
 * Get API key from preferences
 */
export function getApiKey(): string {
  const { apiKey } = getPreferenceValues<Preferences>();
  if (!apiKey?.trim()) {
    throw new Error("API Key is not configured. Please set it in extension preferences.");
  }
  return apiKey.trim();
}

/**
 * Get validated API host from preferences
 */
export function getApiHost(): string {
  const { apiHost } = getPreferenceValues<Preferences>();
  return sanitizeUrl(apiHost);
}

/**
 * Get authentication headers with API key
 */
export function getAuthHeaders(): Record<string, string> {
  return {
    "x-api-key": getApiKey(),
    "Content-Type": "application/json",
    ...SECURITY_HEADERS,
  };
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = API_CONFIG.TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text().catch(() => "{}");

    let errorData: Partial<ApiErrorResponse>;
    try {
      errorData = JSON.parse(errorText) as Partial<ApiErrorResponse>;
    } catch {
      errorData = {};
    }

    throw new ApiError(
      errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      errorData.code,
    );
  }
  return response.json() as Promise<T>;
}

/**
 * Make API request with timeout and safe retries for idempotent GET requests
 */
export async function apiRequest<T>(endpoint: string, options: RequestInit = {}, retryCount: number = 0): Promise<T> {
  const url = `${getApiHost()}${endpoint}`;
  const headers = options.headers || {};
  const method = (options.method || "GET").toUpperCase();

  const isPublicEndpoint = endpoint === "/api/health";
  const finalHeaders = isPublicEndpoint
    ? { ...headers, "Content-Type": "application/json" }
    : { ...getAuthHeaders(), ...headers };

  try {
    const response = await fetchWithTimeout(url, {
      ...options,
      headers: finalHeaders,
    });

    return await handleResponse<T>(response);
  } catch (error) {
    const appError = handleError(error);

    if (method === "GET" && retryCount < API_CONFIG.RETRY_ATTEMPTS && isRetryableError(appError)) {
      await new Promise((resolve) => setTimeout(resolve, API_CONFIG.RETRY_DELAY_MS * (retryCount + 1)));
      return apiRequest<T>(endpoint, options, retryCount + 1);
    }

    throw error;
  }
}

/**
 * GET request helper
 */
export function get<T>(endpoint: string, params?: Record<string, string | number>): Promise<T> {
  const url = params
    ? `${endpoint}?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))}`
    : endpoint;
  return apiRequest<T>(url, { method: "GET" });
}

/**
 * POST request helper
 */
export function post<T>(endpoint: string, body: unknown): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * PATCH request helper
 */
export function patch<T>(endpoint: string, body: unknown): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/**
 * DELETE request helper
 */
export function del<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: "DELETE" });
}
