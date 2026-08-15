import { useEffect, useRef } from "react";
import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useProfileContext } from "@src/hooks/use-profile-context";
import type { Environment } from "@src/types";
import { titleCase, parseStripeError, getEnvironmentLabel } from "@src/utils";
import get from "lodash/get";

const BASE_URL = "https://api.stripe.com/v1/";

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

/**
 * Determines the appropriate toast notification options based on API request state.
 */
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
  const envLabel = getEnvironmentLabel(environment);
  const profileLabel = profileName ? ` (${profileName})` : "";
  const apiKey = environment === "test" ? testApiKey : liveApiKey;

  // Check for missing API key
  if (!apiKey) {
    return {
      style: Toast.Style.Failure,
      title: `${envLabel} API Key not configured${profileLabel}`,
      message: `Please add a ${envLabel} API key to this profile`,
    };
  }

  // Loading state
  if (isLoading) {
    return {
      style: Toast.Style.Animated,
      title: "Fetching...",
      message: `${titleCase(endpoint)} from ${envLabel}${profileLabel}`,
    };
  }

  // Error state
  if (error) {
    return {
      style: Toast.Style.Failure,
      title: `Failed to load ${titleCase(endpoint)}`,
      message: error instanceof Error ? parseStripeError(error, environment) : "Unknown error occurred",
    };
  }

  // Success state
  if (data) {
    return {
      style: Toast.Style.Success,
      title: `${titleCase(endpoint)} Loaded`,
      message: `${envLabel}${profileLabel}`,
    };
  }

  // Fallback
  return {
    style: Toast.Style.Failure,
    title: "Error",
    message: "Unknown error occurred",
  };
};

/**
 * Extracts data from Stripe API response.
 * For list responses, extracts the `data` array; returns empty array on error.
 */
const resolveData = (data: unknown, error: unknown, isList: boolean): unknown => {
  if (isList) {
    return error ? [] : get(data, "data", []);
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
            const errorData = (await response.json()) as { error?: { message?: string } };
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
