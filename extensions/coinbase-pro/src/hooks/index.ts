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
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    (async () => {
      if (!shouldExecute) return;
      setIsLoading(true);
      let toast;
      if (shouldShowToast) {
        toast = await showToast(ToastStyle.Animated, `Fetching ${capitalize(name)}`);
      }
      try {
        if (refreshInterval) {
          intervalId = setInterval(async () => {
            setIsLoading(true);
            const data = await fetchFunc();
            if (data) setState(data);
            setIsLoading(false);
          }, refreshInterval);
        }

        const data = await fetchFunc();
        if (data) setState(data);

        if (shouldShowToast) createResolvedToast(toast, `${capitalize(name)} Fetched`).success();
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
        const message = (error as string) || "";
        setError(message);
        if (shouldShowToast) createResolvedToast(toast, `Failed to fetch ${name.toLowerCase()}`, message).error();
      }
    })();
    return () => clearInterval(intervalId);
  }, deps);

  return { data: state, error, isLoading };
};
