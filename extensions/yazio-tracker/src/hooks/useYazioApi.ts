// Custom hook for centralized API error handling
import { useCachedPromise } from "@raycast/utils";

type ApiFunction<T, P extends unknown[] = []> = (...args: P) => Promise<T>;
type MockDataFunction<T> = () => T;

interface UseYazioApiOptions<T, P extends unknown[] = []> {
  apiCall: ApiFunction<T, P>;
  mockData: MockDataFunction<T>;
  args?: P;
  isDevelopment?: boolean;
}

export function useYazioApi<T, P extends unknown[] = []>({
  apiCall,
  mockData,
  args,
  isDevelopment: isDevMode = false,
}: UseYazioApiOptions<T, P>) {
  return useCachedPromise(
    async (...callArgs: P) => {
      if (isDevMode) {
        // Simulate network delay in development
        await new Promise((resolve) => setTimeout(resolve, 300));
        return mockData();
      }

      try {
        return await apiCall(...callArgs);
      } catch (error) {
        // Centralized error handling
        if (error instanceof Error) {
          if (error.message.includes("oauth/token")) {
            throw new Error("Please check your Yazio credentials in extension preferences");
          }
          if (error.message.includes("network")) {
            throw new Error("Network error. Please check your internet connection and try again");
          }
          if (error.message.includes("timeout")) {
            throw new Error("Request timed out. Please try again");
          }
        }

        // Generic error fallback
        throw new Error("Something went wrong. Please try again later");
      }
    },
    (args ?? []) as P,
  );
}
