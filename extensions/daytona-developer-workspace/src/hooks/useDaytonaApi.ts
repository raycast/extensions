/**
 * Custom React Hook for Daytona API Operations
 * Task 18.4: Abstract common data-fetching pattern with error handling
 */

import { useState, useEffect } from "react";
import { handleDaytonaError, mapErrorToUserFriendly } from "../lib/error-handler";

export interface UseDaytonaApiResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  reload: () => void;
}

/**
 * Custom hook for Daytona API calls with loading states and error handling
 * @param apiCall - Async function that performs the API operation
 * @param deps - Dependency array for useEffect (optional)
 * @returns Object with data, loading state, error, and reload function
 */
export function useDaytonaApi<T>(apiCall: () => Promise<T>, deps: React.DependencyList = []): UseDaytonaApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const execute = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await apiCall();
      setData(result);
    } catch (err) {
      const daytonaError = mapErrorToUserFriendly(err);
      const errorObj = err instanceof Error ? err : new Error(daytonaError.message);
      setError(errorObj);

      // Show error toast to user
      await handleDaytonaError(err, "API operation");
    } finally {
      setIsLoading(false);
    }
  };

  const reload = () => {
    execute();
  };

  useEffect(() => {
    execute();
  }, deps);

  return {
    data,
    isLoading,
    error,
    reload,
  };
}
