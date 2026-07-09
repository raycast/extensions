import { usePromise } from "@raycast/utils";
import { useEffect } from "react";
import { getConfig, listAllModels } from "../lib/lmstudio";

const REFRESH_INTERVAL_MS = 10_000;

export interface ChatModel {
  id: string;
  vision: boolean;
}

/**
 * Chat-capable models on the LM Studio server (embeddings excluded), fetched
 * fresh from the native API (which exposes capabilities.vision) and
 * re-fetched on an interval so removed/added models show up promptly.
 * Loaded models sort first; unloaded ones still work via JIT loading.
 */
export function useLoadedModels() {
  const { data, isLoading, error, revalidate } = usePromise(async () => {
    const all = await listAllModels(getConfig());
    return all
      .filter((m) => m.kind !== "embedding")
      .sort((a, b) => Number(b.loaded) - Number(a.loaded))
      .map((m): ChatModel => ({ id: m.id, vision: m.vision }));
  }, []);

  useEffect(() => {
    const timer = setInterval(revalidate, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [revalidate]);

  return { models: data, isLoading, error, revalidate };
}
