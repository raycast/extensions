import { useEffect, useState } from "react";

/**
 * A custom React hook that debounces a value with a specified delay.
 * Useful for preventing rapid-fire updates when a value changes frequently.
 *
 * @template T - The type of the value being debounced
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds before the value updates
 * @returns The debounced value, which updates only after the delay has passed
 *
 * @example
 * ```tsx
 * const [searchText, setSearchText] = useState("");
 * const debouncedSearch = useDebounce(searchText, 300);
 *
 * // debouncedSearch will update 300ms after the last change to searchText
 * useEffect(() => {
 *   performSearch(debouncedSearch);
 * }, [debouncedSearch]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up the timer
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timer
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * A custom React hook that manages loading states for asynchronous operations.
 * Provides a simple interface for handling loading states, errors, and state transitions.
 *
 * @returns An object containing loading state and utility functions
 * @property isLoading - Boolean indicating if an operation is in progress
 * @property error - Error message if an operation failed, undefined otherwise
 * @property startLoading - Function to set loading state to true and clear any errors
 * @property stopLoading - Function to set loading state to false
 * @property setLoadingError - Function to set an error message and stop loading
 *
 * @example
 * ```tsx
 * const { isLoading, error, startLoading, stopLoading, setLoadingError } = useLoadingState();
 *
 * const fetchData = async () => {
 *   startLoading();
 *   try {
 *     const data = await api.fetch();
 *     stopLoading();
 *   } catch (err) {
 *     setLoadingError(err.message);
 *   }
 * };
 * ```
 */
export function useLoadingState() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  /**
   * Starts a loading operation by setting isLoading to true and clearing any previous errors
   */
  const startLoading = () => {
    setIsLoading(true);
    setError(undefined);
  };

  /**
   * Stops a loading operation by setting isLoading to false
   */
  const stopLoading = () => {
    setIsLoading(false);
  };

  /**
   * Sets an error message and stops the loading state
   * @param errorMessage - The error message to display
   */
  const setLoadingError = (errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
  };

  return {
    isLoading,
    error,
    startLoading,
    stopLoading,
    setLoadingError,
  };
}
