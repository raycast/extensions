/**
 * 42 API client abstraction
 * Centralizes all API interactions with the 42 intranet
 */

import { ensureAuthenticated } from "./auth";
import { User, LocationStats, DateRange } from "./types";
import { API_BASE_URL } from "./constants";

// =============================================================================
// TYPES
// =============================================================================

export interface ApiError {
  status: number;
  message: string;
  isUnauthorized: boolean;
  isForbidden: boolean;
  isNotFound: boolean;
}

export interface ApiResult<T> {
  data?: T;
  error?: ApiError;
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

async function getHeaders(): Promise<HeadersInit> {
  const token = await ensureAuthenticated();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function parseApiError(error: unknown, status?: number): ApiError {
  const message = error instanceof Error ? error.message : "An unknown error occurred";
  const statusCode = status || 0;

  return {
    status: statusCode,
    message,
    isUnauthorized: statusCode === 401 || message.toLowerCase().includes("unauthorized"),
    isForbidden: statusCode === 403 || message.toLowerCase().includes("forbidden"),
    isNotFound: statusCode === 404 || message.toLowerCase().includes("not found"),
  };
}

async function fetchApi<T>(endpoint: string): Promise<ApiResult<T>> {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        error: parseApiError(new Error(errorText), response.status),
      };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return { error: parseApiError(error) };
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Fetch a user by their login
 */
export async function getUser(login: string): Promise<ApiResult<User>> {
  return fetchApi<User>(`/users/${login}`);
}

/**
 * Fetch location stats for a user
 * @param userId The user's numeric ID
 * @param dateRange Date range for the query
 */
export async function getLocationStats(userId: number, dateRange: DateRange): Promise<ApiResult<LocationStats>> {
  return fetchApi<LocationStats>(
    `/users/${userId}/locations_stats?begin_at=${dateRange.beginAt}&end_at=${dateRange.endAt}`,
  );
}

/**
 * Fetch a user and their location stats in one call
 * Convenience method that chains the two API calls
 */
export async function getUserWithStats(
  login: string,
  dateRange: DateRange,
): Promise<ApiResult<{ user: User; stats: LocationStats }>> {
  // First, get the user
  const userResult = await getUser(login);
  if (userResult.error) {
    return { error: userResult.error };
  }

  if (!userResult.data) {
    return {
      error: {
        status: 404,
        message: "User not found",
        isUnauthorized: false,
        isForbidden: false,
        isNotFound: true,
      },
    };
  }

  // Then, get their stats
  const statsResult = await getLocationStats(userResult.data.id, dateRange);
  if (statsResult.error) {
    return { error: statsResult.error };
  }

  return {
    data: {
      user: userResult.data,
      stats: statsResult.data || {},
    },
  };
}

// =============================================================================
// API OBJECT (for convenient importing)
// =============================================================================

export const api42 = {
  getUser,
  getLocationStats,
  getUserWithStats,
};
