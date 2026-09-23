import { usePromise } from "@raycast/utils";
import { useRef } from "react";
import { getData } from "../api/radio";

export function useRadioMetadata(url: string | null) {
  const abortable = useRef<AbortController | null>(null);

  return usePromise(
    async (url) => {
      return await getData(url, abortable.current?.signal);
    },
    [url],
    {
      execute: !!url,
      abortable,
    },
  );
}
