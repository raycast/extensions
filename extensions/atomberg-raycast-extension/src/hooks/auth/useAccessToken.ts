import { useQuery } from "@tanstack/react-query";
import { apiServiceManager } from "../../services/api-service";
import { queryKeys } from "../../lib/query-client";

/**
 * Custom hook for managing access token retrieval and caching
 *
 * This hook handles the authentication flow by fetching access tokens using
 * the provided API credentials. It includes intelligent caching and refetching
 * strategies to minimize API calls while ensuring token freshness.
 *
 * @param preferences - User preferences containing API credentials
 * @returns React Query result object with access token data and state
 *
 *
 * @remarks
 * - Only enabled when both API key and refresh token are provided
 * - Tokens are cached for 20 minutes (tokens expire in 24 hours)
 * - Garbage collection occurs after 30 minutes of inactivity
 * - Does not refetch on window focus to reduce unnecessary API calls
 */
export function useAccessToken(preferences: Preferences) {
  const apiService = apiServiceManager.getApiService(preferences);

  return useQuery({
    queryKey: queryKeys.accessToken(preferences),
    queryFn: () => apiService.getAccessToken(),
    enabled: !!(preferences.apiKey?.trim() && preferences.refreshToken?.trim()),
    staleTime: 20 * 60 * 1000, // 20 minutes - tokens expire in 24 hours
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
    refetchOnWindowFocus: false,
  });
}
