import { useEffect } from "react";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { usePropsContext } from "./use-props-context";
import { titleCase } from "../utils";

const BASE_URL = "https://api.stripe.com/v1/";

const resolveToastOptions = ({
  isLoading,
  data,
  error,
  endpoint,
}: any): {
  style: Toast.Style;
  title: string;
  message?: string;
} => {
  const { Animated, Failure, Success } = Toast.Style;

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
      message: error.message,
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

export const useStripeApi = (endpoint: string) => {
  const { environment } = usePropsContext();
  const { stripeTestApiKey, stripeLiveApiKey } = getPreferenceValues();

  const apiKey = environment === "test" ? stripeTestApiKey : stripeLiveApiKey;

  const fetch = useFetch(BASE_URL + endpoint, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const { isLoading, data, error } = fetch;

  useEffect(() => {
    const options = resolveToastOptions({ ...fetch, endpoint });
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

  return fetch;
};
