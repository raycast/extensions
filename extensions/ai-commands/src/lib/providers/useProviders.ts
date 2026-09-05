import { useCallback } from "react";
import { showFailureToast, usePromise } from "@raycast/utils";
import { loadCustomProviders, saveCustomProviders } from "./storage";
import { CustomModel, CustomProvider } from "./types";
import { fetchProviderModels } from "./model-sync";

/**
 * Hook for managing custom AI providers configuration
 */
export function useProviders() {
  const {
    data = [],
    isLoading,
    error,
    revalidate,
  } = usePromise(async () => loadCustomProviders(), [], {
    onError: (error) => {
      showFailureToast(error, { title: "Error loading providers" });
      console.error(error);
    },
  });

  const saveProviders = useCallback(
    async (providersToSave: CustomProvider[]) => {
      try {
        await saveCustomProviders(providersToSave);
        revalidate();
      } catch (error) {
        showFailureToast(error, { title: "Error saving providers" });
        console.error(error);
        throw error;
      }
    },
    [revalidate],
  );

  const syncProviderModels = useCallback(
    async (provider: CustomProvider, signal?: AbortSignal) => {
      const models = await fetchProviderModels(provider, signal);
      const updatedProviders = data.map((item) => (item.id === provider.id ? { ...item, models } : item));
      await saveProviders(updatedProviders);
      return models.length;
    },
    [data, saveProviders],
  );

  const removeProvider = useCallback(
    (providerId: string) => {
      const updatedProviders = data.filter((p) => p.id !== providerId);
      return saveProviders(updatedProviders);
    },
    [data, saveProviders],
  );

  const removeModel = useCallback(
    (providerId: string, modelId: string) => {
      const updatedProviders = data.map((provider) => {
        if (provider.id === providerId) {
          const updatedModels = provider.models.filter((m) => m.id !== modelId);
          return {
            ...provider,
            models: updatedModels,
          };
        }
        return provider;
      });
      return saveProviders(updatedProviders);
    },
    [data, saveProviders],
  );

  const putProvider = useCallback(
    (provider: CustomProvider, oldProviderId?: string) => {
      let updatedProviders = [...data];

      if (oldProviderId && oldProviderId !== provider.id) {
        updatedProviders = updatedProviders.filter((p) => p.id !== oldProviderId);
      }

      const existingIndex = updatedProviders.findIndex((p) => p.id === provider.id);
      if (existingIndex >= 0) {
        updatedProviders[existingIndex] = provider;
      } else {
        updatedProviders.push(provider);
      }

      return saveProviders(updatedProviders);
    },
    [data, saveProviders],
  );

  const putModel = useCallback(
    (providerId: string, model: CustomModel, oldModelId?: string) => {
      const updatedProviders = data.map((provider) => {
        if (provider.id !== providerId) {
          return provider;
        }

        let updatedModels = [...provider.models];

        if (oldModelId && oldModelId !== model.id) {
          updatedModels = updatedModels.filter((m) => m.id !== oldModelId);
        }

        const existingIndex = updatedModels.findIndex((m) => m.id === model.id);
        if (existingIndex >= 0) {
          updatedModels[existingIndex] = model;
        } else {
          updatedModels.push(model);
        }

        return {
          ...provider,
          models: updatedModels,
        };
      });

      saveProviders(updatedProviders);
    },
    [data, saveProviders],
  );

  return {
    providers: data,
    isLoading,
    error,
    revalidate,
    saveProviders,
    removeProvider,
    removeModel,
    putProvider,
    putModel,
    syncProviderModels,
  };
}
