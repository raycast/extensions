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

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    (async () => {
      if (!shouldExecute) return;

      let toast;
      if (shouldShowToast) {
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

        const data = await fetchFunc();
        if (data) setState(data);

        if (shouldShowToast) createResolvedToast(toast, `${capitalize(name)} fetched`).success();
        setIsLoading(false);
      } catch (error) {
        console.log("BIG ERROR HERE");
        setIsLoading(false);

        if (typeof error === "string") {
          const message = (error as string) || "";
          setError(error);
          if (shouldShowToast) createResolvedToast(toast, `Failed to fetch ${name.toLowerCase()}`, message).error();
        } else {
          setError("Something went wrong");
          if (shouldShowToast) createResolvedToast(toast, `Failed to fetch ${name.toLowerCase()}`).error();
        }
      }
    })();
    return () => clearInterval(intervalId);
  }, deps);

  return { data: state, error, isLoading };
};
