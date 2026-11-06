import { useCachedPromise } from "@raycast/utils";
import { useRef } from "react";
import { setTimeout } from "node:timers/promises";
import { getAssetDetails } from "../lib/hugging-face";

export function useAssetDetails(id: string) {
  const abortable = useRef<AbortController | null>(null);
  return useCachedPromise(
    async (assetId: string) => {
      const signal = abortable.current?.signal;
      // Moving quickly through the list should not fetch every asset passed along the way.
      await setTimeout(200, undefined, { signal });
      return getAssetDetails(assetId, signal);
    },
    [id],
    {
      execute: Boolean(id),
      abortable,
      failureToastOptions: { title: "Could Not Load Asset" },
    },
  );
}
