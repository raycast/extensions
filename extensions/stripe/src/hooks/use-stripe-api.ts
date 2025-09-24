import { useEffect } from "react";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
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

  const fetch = useFetch(BASE_URL + endpoint, {
    initialData: {
      data: [],
    },
    keepPreviousData: false,
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const { isLoading, data, error } = fetch;

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

    return () => {
      if (isLoading) {
        showToast({
          style: Toast.Style.Failure,
          title: `Fetch cancelled`,
        });
      }
    };
  }, [isLoading, data, error]);

  return { ...fetch, data: resolveData(data, error, isList) };
};
