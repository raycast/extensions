import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { LMStudioModel, ModelType } from "../types";
import { createClient, friendlyError } from "./raycast";

export const DEFAULT_CHAT_MODEL_STORAGE_KEY = "lm-studio.default-chat-model.v1";

export async function getDefaultChatModelKey() {
  const stored = await LocalStorage.getItem<string>(DEFAULT_CHAT_MODEL_STORAGE_KEY);
  return typeof stored === "string" && stored.trim() ? stored.trim() : undefined;
}

export async function setDefaultChatModelKey(modelKey?: string) {
  const normalized = modelKey?.trim();
  if (normalized) {
    await LocalStorage.setItem(DEFAULT_CHAT_MODEL_STORAGE_KEY, normalized);
  } else {
    await LocalStorage.removeItem(DEFAULT_CHAT_MODEL_STORAGE_KEY);
  }
}

export function useDefaultChatModel() {
  const [defaultModelKey, setStoredDefaultModelKey] = useState<string>();
  const [isLoadingDefaultModel, setIsLoadingDefaultModel] = useState(true);

  useEffect(() => {
    let active = true;
    void getDefaultChatModelKey()
      .then((modelKey) => {
        if (active) setStoredDefaultModelKey(modelKey);
      })
      .catch(() => {
        if (active) setStoredDefaultModelKey(undefined);
      })
      .finally(() => {
        if (active) setIsLoadingDefaultModel(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const setDefaultModelKey = useCallback(async (modelKey?: string) => {
    await setDefaultChatModelKey(modelKey);
    setStoredDefaultModelKey(modelKey?.trim() || undefined);
  }, []);

  return {
    defaultModelKey,
    isLoadingDefaultModel,
    setDefaultModelKey,
  };
}

export function useLMStudioModels(type?: ModelType) {
  const [client] = useState(createClient);
  const [models, setModels] = useState<LMStudioModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const availableModels = await client.listModels();
      setModels(type ? availableModels.filter((model) => model.type === type) : availableModels);
    } catch (caughtError) {
      setError(friendlyError(caughtError));
    } finally {
      setIsLoading(false);
    }
  }, [client, type]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { client, models, setModels, isLoading, error, refresh };
}

export function preferredModel(models: LMStudioModel[], defaultModelKey?: string) {
  return (
    models.find((model) => model.key === defaultModelKey) ??
    models.find((model) => model.loadedInstances.length > 0) ??
    models[0]
  );
}
