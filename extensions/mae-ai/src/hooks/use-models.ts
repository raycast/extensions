import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchModels, Model } from "../lib/models";
import { Provider } from "../lib/stream";

export function useModels(
  provider: Provider,
  preferred?: string,
  toolId?: string,
) {
  const [models, setModels] = useState<Model[]>([]);
  const [model, setModel] = useState(preferred || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const selectionKey = `pocket-ai.model:${provider.baseUrl}:${toolId || "default"}`;

  useEffect(() => {
    const abort = new AbortController();
    let active = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      void (async () => {
        let selected = preferred || "";
        try {
          if (toolId)
            selected =
              (await LocalStorage.getItem<string>(selectionKey)) || selected;
          const available = await fetchModels(provider, abort.signal);
          if (!active) return;
          setModels(available);
          setModel(
            available.some((item) => item.id === selected)
              ? selected
              : available.find((item) => item.id === "gpt-6-luna")?.id ||
                  available[0].id,
          );
        } catch (failure) {
          if (!active) return;
          setModels(selected ? [{ id: selected, name: selected }] : []);
          setModel(selected);
          setError(
            failure instanceof Error ? failure.message : String(failure),
          );
        } finally {
          if (active) setLoading(false);
        }
      })();
    }, 250);
    return () => {
      active = false;
      abort.abort();
      clearTimeout(timer);
    };
  }, [
    provider.baseUrl,
    provider.apiKey,
    preferred,
    selectionKey,
    toolId,
    attempt,
  ]);

  function selectModel(value: string) {
    if (!value || value === model || !models.some((item) => item.id === value))
      return;
    setModel(value);
    if (toolId) {
      void LocalStorage.setItem(selectionKey, value).catch((failure: unknown) =>
        setError(failure instanceof Error ? failure.message : String(failure)),
      );
    }
  }

  return {
    models,
    model,
    selectModel,
    loading,
    error,
    reload: () => setAttempt((value) => value + 1),
  };
}
