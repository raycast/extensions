import { useEffect, useState } from "react";
import { showToast, ToastStyle } from "@raycast/api";
import { createResolvedToast, capitalize } from "../utils";

export const useFetch = (fetchFunc: () => any, options: any = {}, deps: any[] = []): any => {
  const {
    name = "",
    defaultValue = null,
    shouldShowToast = false,
    shouldExecute = true,
    refreshInterval = null,
  } = options;
  const [state, setState] = useState<any>(defaultValue);
  const [error, setError] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFirstFetch, setIsFirstFetch] = useState<boolean>(true);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    (async () => {
      if (!shouldExecute) return;

      let toast;
      if ((shouldShowToast && isFirstFetch) || (shouldShowToast && !refreshInterval)) {
        toast = await showToast(ToastStyle.Animated, `Fetching ${capitalize(name)}`);
      }

      try {
        if (refreshInterval) {
          intervalId = setInterval(async () => {
            let refreshToast;
            if (shouldShowToast) {
              refreshToast = await showToast(ToastStyle.Animated, `Refreshing ${capitalize(name)}`);
            }
            try {
              const data = await fetchFunc();
              if (data) setState(data);
              if (shouldShowToast) createResolvedToast(refreshToast, `${capitalize(name)} refreshed`).success();
            } catch (error) {
              setError("Something went wrong");
              if (shouldShowToast) createResolvedToast(refreshToast, `Failed to refresh ${name.toLowerCase()}`).error();
            }
          }, refreshInterval);
        }

        if (isFirstFetch || !refreshInterval) {
          const data = await fetchFunc();
          if (data) setState(data);
          if (shouldShowToast) createResolvedToast(toast, `${capitalize(name)} fetched`).success();
          setIsFirstFetch(false);
        }

        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
        const shouldUpdateToast =
          (!refreshInterval && shouldShowToast && toast) || isFirstFetch || (!refreshInterval && toast);
        if (typeof error === "string") {
          const message = (error as string) || "";
          setError(error);
          if (shouldUpdateToast) {
            createResolvedToast(toast, `Failed to fetch ${name.toLowerCase()}`, message).error();
          }
        } else {
          setError("Something went wrong");
          if (shouldUpdateToast) {
            createResolvedToast(toast, `Failed to fetch ${name.toLowerCase()}`).error();
          }
        }
      }
    })();
    return () => clearInterval(intervalId);
  }, deps);

  return { data: state, error, isLoading };
};
