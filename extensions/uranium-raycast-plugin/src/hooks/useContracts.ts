import { useQuery } from "@tanstack/react-query";
import { api, UserContractsResponseDto } from "../api";
import { AxiosError } from "axios";

// Query keys for better cache management
export const contractsQueryKeys = {
  all: ["contracts"] as const,
  lists: () => [...contractsQueryKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) => [...contractsQueryKeys.lists(), filters] as const,
} as const;

// Custom hook for fetching contracts
export function useContractsQuery() {
  return useQuery({
    queryKey: contractsQueryKeys.list(),
    queryFn: async (): Promise<UserContractsResponseDto> => {
      const response = await api.contracts.list(null, {});

      // Handle API response status
      if (response.status === "ok") {
        return response;
      } else {
        throw new Error(response.errorCode || "Failed to load collections");
      }
    },
    select: (data) => ({
      ...data,
      contracts: data.data, // Make contracts easily accessible
    }),
    // Transform error for better handling
    throwOnError: false,
    // Custom error handling
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error instanceof AxiosError && error.response?.status === 401) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
  });
}

// Helper function to get error message
export function getContractsErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response?.status === undefined) {
      return "Network error occurred.";
    }
    if (error.response?.status === 401) {
      return "Authentication failed. Please check your API key.";
    }
    if (error.response?.status === 403) {
      return "Access denied. Please check your permissions.";
    }
    if (error.response?.status >= 500) {
      return "Server error. Please try again later.";
    }
    return error.message || "Network error occurred.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}
