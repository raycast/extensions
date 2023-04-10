import { useEffect } from "react";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import get from "lodash/get";
import startCase from "lodash/startCase";

const BASE_URL = "https://app.humaans.io/api/";

type ToastResolveProps = {
  isLoading: boolean;
  data: any;
  error: any;
  endpoint: string;
  apiKey: string;
};

const resolveToastOptions = ({
  isLoading,
  data,
  error,
  endpoint,
  apiKey,
}: ToastResolveProps): {
  style: Toast.Style;
  title: string;
  message?: string;
} => {
  const { Animated, Failure, Success } = Toast.Style;

  if (!apiKey) {
    return {
      style: Failure,
      title: "Humaans API Key is not configured",
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
      message: error.message,
    };
  }

  if (data) {
    return {
      style: Success,
      title: `${startCase(endpoint)} Loaded`,
    };
  }

  return {
    style: Failure,
    title: "Error",
    message: "Unknown error occurred",
  };
};

const resolveData = (data: any, error: any, isList: boolean) => {
  // we don't want to show the data if it's a list and we have an error
  if (isList && error) {
    return [];
  }

  if (isList && data) {
    return get(data, "data", []);
  }

  return data;
};
export const useHumaansApi = (endpoint: string, { isList = false, shouldShowToast = true }) => {
  const { apiKey } = getPreferenceValues();

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
      apiKey,
    });

    if (shouldShowToast) {
      showToast(options);
    }

    return () => {
      if (isLoading && shouldShowToast) {
        showToast({
          style: Toast.Style.Failure,
          title: `Fetch cancelled`,
        });
      }
    };
  }, [isLoading, data, error]);

  return { ...fetch, data: resolveData(data, error, isList) };
};
