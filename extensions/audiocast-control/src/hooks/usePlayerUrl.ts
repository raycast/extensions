import { useRef } from "react";
import { usePromise } from "@raycast/utils";
import { getDeviceUrl } from "../lib/discover";

export function usePlayerUrl() {
  const abortable = useRef<AbortController | null>(null);

  return usePromise(
    async () => {
      return await getDeviceUrl(abortable.current?.signal);
    },
    [],
    {
      abortable,
    },
  );
}
