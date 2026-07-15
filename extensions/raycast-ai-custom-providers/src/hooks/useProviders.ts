import { useCallback } from "react";
import { usePromise } from "@raycast/utils";
import { readProvidersFile, writeProvidersFile } from "../utils/yaml-handler";
import { Provider, Model } from "../types";
import { showFailureToast } from "@raycast/utils";

/**
 * Hook for managing AI providers configuration
 * Provides functions to load and save providers
 */
export function useProviders() {
  const {
    data = [],
    isLoading,
    error,
    revalidate,
  } = usePromise(async () => readProvidersFile(), [], {
    onError: (error) => {
      showFailureToast(error, { title: "Error loading providers" });
      console.error(error);
    },
  });

  /**
   * Saves providers to the YAML file
   * @param providersToSave Array of providers to save
   */
  const saveProviders = useCallback(
    (providersToSave: Provider[]) => {
      try {
        writeProvidersFile(providersToSave);
        revalidate();
      } catch (error) {
        showFailureToast(error, { title: "Error saving providers" });
        console.error(error);
        throw error;
      }
    },
    [revalidate],
  );

  /**
   * Removes a provider by ID
   * @param providerId ID of the provider to remove
   */
  const removeProvider = useCallback(
    (providerId: string) => {
      const updatedProviders = data.filter((p) => p.id !== providerId);
      saveProviders(updatedProviders);
    },
    [data, saveProviders],
  );

  /**
   * Removes a model from a provider by IDs
   * @param providerId ID of the provider
   * @param modelId ID of the model to remove
   */
  const removeModel = useCallback(
    (providerId: string, modelId: string) => {
      const updatedProviders = data.map((provider) => {
        if (provider.id === providerId) {
          // Remove the model from this provider's models array
          const updatedModels = provider.models.filter((m) => m.id !== modelId);
          return {
            ...provider,
            models: updatedModels,
          };
        }
        return provider;
      });
      saveProviders(updatedProviders);
    },
    [data, saveProviders],
  );

  /**
   * Creates or updates a provider
   * If a provider with the same ID exists, it will be updated; otherwise, a new provider will be created
   * @param provider Provider data to save
   * @param oldProviderId Optional old provider ID - if provided and different from new ID, removes old provider before adding new one (for renaming)
   */
  const putProvider = useCallback(
    (provider: Provider, oldProviderId?: string) => {
      let updatedProviders = [...data];

      // If oldProviderId is provided and different from new ID, remove old provider first
      if (oldProviderId && oldProviderId !== provider.id) {
        updatedProviders = updatedProviders.filter((p) => p.id !== oldProviderId);
      }

      // Find existing provider by new ID
      const existingIndex = updatedProviders.findIndex((p) => p.id === provider.id);

      if (existingIndex >= 0) {
        // Update existing provider
        updatedProviders[existingIndex] = provider;
      } else {
        // Add new provider
        updatedProviders.push(provider);
      }

      saveProviders(updatedProviders);
    },
    [data, saveProviders],
  );

  /**
   * Creates or updates a model in a provider
   * If a model with the same ID exists, it will be updated; otherwise, a new model will be added
   * @param providerId ID of the provider that owns the model
   * @param model Model data to save
   * @param oldModelId Optional old model ID - if provided and different from new ID, removes old model before adding new one (for renaming)
   */
  const putModel = useCallback(
    (providerId: string, model: Model, oldModelId?: string) => {
      const updatedProviders = data.map((provider) => {
        if (provider.id !== providerId) {
          return provider;
        }

        let updatedModels = [...provider.models];

        // If oldModelId is provided and different from new ID, remove old model first
        if (oldModelId && oldModelId !== model.id) {
          updatedModels = updatedModels.filter((m) => m.id !== oldModelId);
        }

        // Find existing model by new ID
        const existingIndex = updatedModels.findIndex((m) => m.id === model.id);

        if (existingIndex >= 0) {
          // Update existing model
          updatedModels[existingIndex] = model;
        } else {
          // Add new model
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
  };
}
