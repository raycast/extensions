import { useEffect } from "react";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEnvContext } from "./use-env-context";
import { Environment } from "./../types";
import { titleCase } from "../utils";
import get from "lodash/get";

const BASE_URL = "https://api.stripe.com/v1/";

type ToastResolveProps = {
  isLoading: boolean;
  data: unknown;
  error: unknown;
  endpoint: string;
  stripeLiveApiKey?: string;
  stripeTestApiKey?: string;
  environment: Environment;
};

const resolveToastOptions = ({
  isLoading,
  data,
  error,
  endpoint,
  stripeLiveApiKey,
  stripeTestApiKey,
  environment,
}: ToastResolveProps): {
  style: Toast.Style;
  title: string;
  message?: string;
} => {
  const { Animated, Failure, Success } = Toast.Style;

  if (environment === "test" && !stripeTestApiKey) {
    return {
      style: Failure,
      title: "Stripe Test API Key is not configured",
    };
  }

  if (environment === "live" && !stripeLiveApiKey) {
    return {
      style: Failure,
      title: "Stripe Live API Key is not configured",
    };
  }

  if (isLoading) {
    return {
      style: Animated,
      title: "Fetching...",
    };
  }

  if (error) {
    return {
      style: Failure,
      title: "Error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }

  if (data) {
    return {
      style: Success,
      title: `${titleCase(endpoint)} Loaded`,
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
export const useStripeApi = (endpoint: string, isList = false) => {
  const { environment } = useEnvContext();
  const { stripeTestApiKey, stripeLiveApiKey } = getPreferenceValues();

  const apiKey = environment === "test" ? stripeTestApiKey : stripeLiveApiKey;

  const { isLoading, data, error, revalidate, mutate } = useCachedPromise(
    async (url: string, key: string) => {
      if (!key) {
        throw new Error(`Stripe ${environment} API key is not configured`);
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${key}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        throw new Error(errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    [BASE_URL + endpoint, apiKey],
    {
      keepPreviousData: true,
      initialData: isList ? { data: [] } : undefined,
    },
  );

  useEffect(() => {
    const options = resolveToastOptions({
      isLoading,
      data,
      error,
      endpoint,
      environment,
      stripeLiveApiKey,
      stripeTestApiKey,
    });
    showToast(options);
  }, [isLoading, data, error]);

  return {
    isLoading,
    data: resolveData(data, error, isList),
    error,
    revalidate,
    mutate,
  };
};
