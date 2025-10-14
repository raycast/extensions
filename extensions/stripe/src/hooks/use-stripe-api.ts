import { useEffect, useRef } from "react";
import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useProfileContext } from "@src/hooks/use-profile-context";
import { Environment } from "@src/types";
import { titleCase } from "@src/utils";
import get from "lodash/get";

const BASE_URL = "https://api.stripe.com/v1/";

/**
 * Parse Stripe API error and return user-friendly message
 */
const parseStripeError = (error: any, env: Environment): string => {
  // Handle network errors
  if (error.message?.includes("fetch")) {
    return "Network error. Check your internet connection.";
  }

  // Handle Stripe API errors
  if (error.message?.includes("Invalid API Key")) {
    return `Invalid ${env === "test" ? "Test" : "Live"} API key. Please check your configuration.`;
  }

  if (error.message?.includes("Unauthorized")) {
    return "Authentication failed. Your API key may have been revoked.";
  }

  if (error.message?.includes("rate limit")) {
    return "Too many requests. Please wait a moment and try again.";
  }

  // Return the original error message if it's user-friendly
  if (error.message && !error.message.includes("HTTP")) {
    return error.message;
  }

  return "Failed to load data from Stripe. Please try again.";
};

type ToastResolveProps = {
  isLoading: boolean;
  data: unknown;
  error: unknown;
  endpoint: string;
  testApiKey?: string;
  liveApiKey?: string;
  environment: Environment;
  profileName?: string;
};

const resolveToastOptions = ({
  isLoading,
  data,
  error,
  endpoint,
  testApiKey,
  liveApiKey,
  environment,
  profileName,
}: ToastResolveProps): {
  style: Toast.Style;
  title: string;
  message?: string;
} => {
  const { Animated, Failure, Success } = Toast.Style;
  const envLabel = environment === "test" ? "Test" : "Live";
  const profileLabel = profileName ? ` (${profileName})` : "";

  if (environment === "test" && !testApiKey) {
    return {
      style: Failure,
      title: `${envLabel} API Key not configured${profileLabel}`,
      message: "Please add a Test API key to this profile",
    };
  }

  if (environment === "live" && !liveApiKey) {
    return {
      style: Failure,
      title: `${envLabel} API Key not configured${profileLabel}`,
      message: "Please add a Live API key to this profile",
    };
  }

  if (isLoading) {
    return {
      style: Animated,
      title: "Fetching...",
      message: `${titleCase(endpoint)} from ${envLabel}${profileLabel}`,
    };
  }

  if (error) {
    const errorMessage = error instanceof Error ? parseStripeError(error, environment) : "Unknown error occurred";

    return {
      style: Failure,
      title: `Failed to load ${titleCase(endpoint)}`,
      message: errorMessage,
    };
  }

  if (data) {
    return {
      style: Success,
      title: `${titleCase(endpoint)} Loaded`,
      message: `${envLabel}${profileLabel}`,
    };
  }

  return {
    style: Failure,
    title: "Error",
    message: "Unknown error occurred",
  };
};

const resolveData = (data: unknown, error: unknown, isList: boolean) => {
  // we don't want to show the data if it's a list and we have an error
  if (isList && error) {
    return [];
  }

  if (isList && data) {
    return get(data, "data", []);
  }

  return data;
};

/**
 * Options for configuring the Stripe API hook.
 */
interface UseStripeApiOptions {
  /**
   * Whether the endpoint returns a list response.
   * When true, the hook will:
   * - Extract the `data` array from the response
   * - Return an empty array on error instead of undefined
   * - Set initial data to `{ data: [] }` for a better loading experience
   *
   * @default false
   */
  isList?: boolean;
}

/**
 * Custom hook for fetching data from the Stripe API.
 *
 * This hook handles authentication, caching, and toast notifications for Stripe API requests.
 * It automatically manages API key selection based on the current environment (test/live).
 *
 * @param endpoint - The Stripe API endpoint to fetch from (e.g., "charges", "customers")
 * @param options - Configuration options for the request
 * @returns An object containing loading state, data, error, and helper functions
 *
 * @example
 * // Fetch a single resource
 * const { isLoading, data, error } = useStripeApi("balance");
 *
 * @example
 * // Fetch a list of resources
 * const { isLoading, data } = useStripeApi("charges", { isList: true });
 */
export const useStripeApi = (endpoint: string, options: UseStripeApiOptions = {}) => {
  const { isList = false } = options;
  const { activeProfile, activeEnvironment } = useProfileContext();
  const toastShownRef = useRef<{ loading?: string; success?: string; error?: string }>({});

  const apiKey = activeEnvironment === "test" ? activeProfile?.testApiKey : activeProfile?.liveApiKey;

  const { isLoading, data, error, revalidate, mutate } = useCachedPromise(
    async (url: string, key: string, profileId: string, env: Environment) => {
      if (!key) {
        throw new Error(
          `${env === "test" ? "Test" : "Live"} API key not configured for this profile. Open "Manage Stripe Accounts" to add it.`,
        );
      }

      try {
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${key}`,
            "Stripe-Version": "2023-10-16", // Pin API version for stability
          },
        });

        if (!response.ok) {
          // Try to parse error response
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          try {
            const errorData: any = await response.json();
            if (errorData?.error?.message) {
              errorMessage = errorData.error.message;
            }
          } catch {
            // If JSON parsing fails, use status text
          }
          throw new Error(errorMessage);
        }

        return response.json();
      } catch (err) {
        // Re-throw with context
        if (err instanceof Error) {
          throw err;
        }
        throw new Error("Network request failed. Please check your connection.");
      }
    },
    [BASE_URL + endpoint, apiKey || "", activeProfile?.id || "", activeEnvironment],
    {
      keepPreviousData: true,
      initialData: isList ? { data: [] } : undefined,
      execute: !!apiKey && !!activeProfile,
      onError: (error) => {
        // Error handling is done in the useEffect below
        console.error(`Stripe API Error [${endpoint}]:`, error);
      },
    },
  );

  // Show toasts only when state actually changes (not on every render)
  useEffect(() => {
    const currentState = isLoading ? "loading" : error ? "error" : data ? "success" : "idle";
    const toastKey = `${endpoint}-${activeProfile?.id}-${activeEnvironment}`;

    // Only show toast if this is a new state for this endpoint/profile/env combo
    if (toastShownRef.current[currentState as keyof typeof toastShownRef.current] === toastKey) {
      return;
    }

    toastShownRef.current = { [currentState]: toastKey };

    const toastOptions = resolveToastOptions({
      isLoading,
      data,
      error,
      endpoint,
      environment: activeEnvironment,
      testApiKey: activeProfile?.testApiKey,
      liveApiKey: activeProfile?.liveApiKey,
      profileName: activeProfile?.name,
    });

    showToast(toastOptions);
  }, [
    isLoading,
    data,
    error,
    endpoint,
    activeEnvironment,
    activeProfile?.id,
    activeProfile?.name,
    activeProfile?.testApiKey,
    activeProfile?.liveApiKey,
  ]);

  return {
    isLoading: isLoading || !apiKey || !activeProfile,
    data: resolveData(data, error, isList),
    error,
    revalidate,
    mutate,
    // Additional helper properties
    hasApiKey: !!apiKey,
    hasProfile: !!activeProfile,
  };
};
