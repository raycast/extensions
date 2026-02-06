import { useState, useEffect, useCallback } from "react";
import { readProvidersFile, writeProvidersFile } from "../utils/yaml-handler";
import { Provider, Model } from "../types";
import { showFailureToast } from "@raycast/utils";

/**
 * Hook for managing AI providers configuration
 * Provides functions to load and save providers
 */
export function useProviders() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Loads providers from the YAML file
   */
  const loadProviders = useCallback(() => {
    try {
      setIsLoading(true);
      setError(null);
      const loadedProviders = readProvidersFile();
      setProviders(loadedProviders);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to load providers");
      setProviders([]);
      setError(error);
      showFailureToast(error, { title: "Error loading providers" });
      console.error("Error loading providers:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Saves providers to the YAML file
   * @param providersToSave Array of providers to save
   */
  const saveProviders = useCallback((providersToSave: Provider[]) => {
    try {
      setError(null);
      writeProvidersFile(providersToSave);
      setProviders(providersToSave);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to save providers");
      setError(error);
      console.error("Error saving providers:", error);
      throw error;
    }
  }, []);

  /**
   * Removes a provider by ID
   * @param providerId ID of the provider to remove
   */
  const removeProvider = useCallback(
    (providerId: string) => {
      try {
        const updatedProviders = providers.filter((p) => p.id !== providerId);
        saveProviders(updatedProviders);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to remove provider");
        setError(error);
        console.error("Error removing provider:", error);
        throw error;
      }
    },
    [providers, saveProviders],
  );

  /**
   * Removes a model from a provider by IDs
   * @param providerId ID of the provider
   * @param modelId ID of the model to remove
   */
  const removeModel = useCallback(
    (providerId: string, modelId: string) => {
      try {
        const updatedProviders = providers.map((provider) => {
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
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to remove model");
        setError(error);
        console.error("Error removing model:", error);
        throw error;
      }
    },
    [providers, saveProviders],
  );

  /**
   * Creates or updates a provider
   * If a provider with the same ID exists, it will be updated; otherwise, a new provider will be created
   * @param provider Provider data to save
   * @param oldProviderId Optional old provider ID - if provided and different from new ID, removes old provider before adding new one (for renaming)
   */
  const putProvider = useCallback(
    (provider: Provider, oldProviderId?: string) => {
      try {
        let updatedProviders = [...providers];

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
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to save provider");
        setError(error);
        console.error("Error saving provider:", error);
        throw error;
      }
    },
    [providers, saveProviders],
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
      try {
        const updatedProviders = providers.map((provider) => {
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
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to save model");
        setError(error);
        console.error("Error saving model:", error);
        throw error;
      }
    },
    [providers, saveProviders],
  );

  // Load providers on mount
  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  return {
    providers,
    isLoading,
    error,
    loadProviders,
    saveProviders,
    removeProvider,
    removeModel,
    putProvider,
    putModel,
  };
}
