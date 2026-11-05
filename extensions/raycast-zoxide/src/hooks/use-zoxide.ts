import { useRef } from "react";
import { useCachedPromise } from "@raycast/utils";
import { queryZoxide } from "@utils/zoxide";

// React wrapper around queryZoxide; aborts the in-flight query when keywords change.
export const useZoxide = (keywords: string[], options?: object) => {
  const abortable = useRef<AbortController>(null);
  return useCachedPromise((kw: string[]) => queryZoxide(kw, abortable.current?.signal), [keywords], {
    abortable,
    ...options,
  });
};
