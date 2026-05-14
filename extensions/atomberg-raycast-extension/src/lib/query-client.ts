import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds default
      gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
      retry: (failureCount: number, error: Error) => {
        // Don't retry on auth errors
        if (error?.message?.includes("Authentication failed") || error?.message?.includes("401")) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
});

// Query keys factory
export const queryKeys = {
  devices: ["devices"] as const,
  devicesList: (credentials: { apiKey?: string; refreshToken?: string }) =>
    [...queryKeys.devices, "list", credentials] as const,
  deviceState: (deviceId: string, credentials: { apiKey?: string; refreshToken?: string }) =>
    [...queryKeys.devices, "state", deviceId, credentials] as const,
  accessToken: (credentials: { apiKey?: string; refreshToken?: string }) => ["access-token", credentials] as const,
} as const;
