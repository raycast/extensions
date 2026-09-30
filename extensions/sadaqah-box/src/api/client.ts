/**
 * API Client with timeout, retry logic, and proper error handling
 */

import { getPreferenceValues } from "@raycast/api";
import { API_CONFIG, SECURITY_HEADERS } from "../constants";
import { handleError } from "../utils/error-handler";
import type { ApiErrorResponse } from "../types";

interface Preferences {
  apiHost: string;
  apiKey: string;
}

/**
 * Get API key from preferences
 */
export function getApiKey(): string {
  const { apiKey } = getPreferenceValues<Preferences>();
  if (!apiKey) {
    throw new Error("API Key is not configured. Please set it in extension preferences.");
  }
  return apiKey;
}

/**
 * Get API host from preferences
 */
export function getApiHost(): string {
  const { apiHost } = getPreferenceValues<Preferences>();
  return apiHost.replace(/\/$/, ""); // Remove trailing slash
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

/**
 * Fetch with timeout support using AbortController
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = API_CONFIG.TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Handle API response with proper error handling
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text().catch(() => "{}");

    let errorData: ApiErrorResponse;
    try {
      errorData = JSON.parse(errorText) as ApiErrorResponse;
    } catch {
      errorData = { success: false, error: "Unknown error occurred" };
    }

    // Create error with status for proper categorization
    const error = new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    (error as Error & { status: number }).status = response.status;
    throw error;
  }
  return response.json() as Promise<T>;
}

/**
 * Make API request with timeout and retry logic
 */
export async function apiRequest<T>(endpoint: string, options: RequestInit = {}, retryCount: number = 0): Promise<T> {
  const url = `${getApiHost()}${endpoint}`;
  const headers = options.headers || {};

  // Add auth headers if not a public endpoint
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

    // Retry on retryable errors
    if (retryCount < API_CONFIG.RETRY_ATTEMPTS && appError.category === "timeout") {
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
