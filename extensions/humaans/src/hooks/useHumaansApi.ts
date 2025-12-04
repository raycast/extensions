import { useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import get from "lodash/get";
import startCase from "lodash/startCase";
import { BASE_URL, USER_AGENT } from "../constants";
import { getApiKey } from "../api/api";

type ToastResolveProps = {
  isLoading: boolean;
  data: any;
  error: any;
  endpoint: string;
};

const resolveToastOptions = ({
  isLoading,
  data,
  error,
  endpoint,
}: ToastResolveProps): {
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
    const startCased = startCase(endpoint);
    return {
      style: Success,
      title: `${startCased[0] + startCased.slice(1).toLowerCase()} loaded`,
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
  const apiKey = getApiKey();

  const fetch = useFetch(BASE_URL + endpoint, {
    initialData: {
      data: [],
    },
    keepPreviousData: false,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": USER_AGENT,
    },
  });

  const { isLoading, data, error } = fetch;

  useEffect(() => {
    const options = resolveToastOptions({
      isLoading,
      data,
      error,
      endpoint,
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
