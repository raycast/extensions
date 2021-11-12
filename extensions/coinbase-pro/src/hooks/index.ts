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
            const data = await fetchFunc();
            if (data) setState(data);
          }, refreshInterval);
        }

        const data = await fetchFunc();
        if (data) setState(data);

        if (shouldShowToast) createResolvedToast(toast, `${capitalize(name)} Fetched`).success();
      } catch (error) {
        const message = (error as string) || "";
        if (shouldShowToast) createResolvedToast(toast, `Failed to fetch ${name.toLowerCase()}`, message).error();
      }
    })();
    return () => clearInterval(intervalId);
  }, deps);

  return state;
};
