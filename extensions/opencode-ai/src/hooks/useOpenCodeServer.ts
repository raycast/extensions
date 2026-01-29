/**
 * React hook for managing the OpenCode server connection
 */

import { useState, useEffect, useCallback } from "react";
import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import {
  ensureServerRunning,
  checkServerHealth,
  getClient,
} from "../lib/server";
import type { Model, ModelGroup } from "../lib/types";

interface UseOpenCodeServerResult {
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  models: Model[];
  modelGroups: ModelGroup[];
  defaultModel: string;
  client: ReturnType<typeof getClient> | null;
  reconnect: () => Promise<void>;
}

// Provider display names for better UX
const PROVIDER_NAMES: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  mistral: "Mistral",
  groq: "Groq",
  bedrock: "AWS Bedrock",
  azure: "Azure OpenAI",
  cloudflare: "Cloudflare",
  ollama: "Ollama",
  openrouter: "OpenRouter",
};

function getProviderDisplayName(providerId: string): string {
  return (
    PROVIDER_NAMES[providerId] ||
    providerId.charAt(0).toUpperCase() + providerId.slice(1)
  );
}

interface Preferences {
  defaultModel?: string;
}

export function useOpenCodeServer(): UseOpenCodeServerResult {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [modelGroups, setModelGroups] = useState<ModelGroup[]>([]);
  const [defaultModel, setDefaultModel] = useState<string>("");
  const [client, setClient] = useState<ReturnType<typeof getClient> | null>(
    null,
  );

  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Start/connect to server
      const serverClient = await ensureServerRunning();
      setClient(serverClient);

      // Fetch available providers and models
      const providersResult = await serverClient.config.providers();

      // Check for error response from the server
      if (providersResult.error) {
        const errorData = providersResult.error as {
          name?: string;
          data?: { message?: string };
        };
        const errorMsg =
          errorData?.data?.message || errorData?.name || "Unknown error";
        throw new Error(`Failed to fetch providers: ${errorMsg}`);
      }

      if (!providersResult.data) {
        throw new Error("Failed to fetch providers: no data returned");
      }

      const { providers, default: defaults } = providersResult.data;

      // Build a flat list of models and grouped models from all providers
      const availableModels: Model[] = [];
      const groups: ModelGroup[] = [];

      for (const provider of providers || []) {
        // models is an object keyed by model ID, not an array
        const modelsObj = provider.models || {};
        const modelsList = Object.values(modelsObj) as Array<{
          id: string;
          name?: string;
        }>;

        const groupModels: Model[] = [];

        for (const model of modelsList) {
          const modelEntry: Model = {
            id: `${provider.id}/${model.id}`,
            name: model.name || model.id,
            providerId: provider.id,
          };
          availableModels.push(modelEntry);
          groupModels.push(modelEntry);
        }

        if (groupModels.length > 0) {
          groups.push({
            providerId: provider.id,
            providerName: getProviderDisplayName(provider.id),
            models: groupModels,
          });
        }
      }

      setModels(availableModels);
      setModelGroups(groups);

      // Determine default model
      // Priority: 1. Raycast preference, 2. Claude Sonnet 4.5, 3. OpenCode config, 4. First available
      const preferences = getPreferenceValues<Preferences>();
      const preferenceModel = preferences.defaultModel?.trim();
      const fallbackDefault = "anthropic/claude-sonnet-4-5";

      // Check if preferred default exists in available models
      let defaultModelId: string | undefined;

      // First check Raycast preference
      if (
        preferenceModel &&
        availableModels.some((m) => m.id === preferenceModel)
      ) {
        defaultModelId = preferenceModel;
      } else if (availableModels.some((m) => m.id === fallbackDefault)) {
        defaultModelId = fallbackDefault;
      } else {
        // Try to get from config
        const configResult = await serverClient.config.get();
        const configModel = configResult.data?.model;

        // Config model might not have provider prefix, try to find it
        if (configModel) {
          // First check if it already has a prefix and exists
          if (availableModels.some((m) => m.id === configModel)) {
            defaultModelId = configModel;
          } else {
            // Try to find it with any provider prefix
            const matchingModel = availableModels.find(
              (m) => m.id.endsWith(`/${configModel}`) || m.id === configModel,
            );
            if (matchingModel) {
              defaultModelId = matchingModel.id;
            }
          }
        }

        // Fallback to provider defaults
        if (!defaultModelId && defaults) {
          const firstDefault = Object.entries(defaults)[0];
          if (firstDefault) {
            const defaultValue = firstDefault[1];
            // Check if it exists in available models
            if (availableModels.some((m) => m.id === defaultValue)) {
              defaultModelId = defaultValue;
            } else {
              // Try with provider prefix
              const matchingModel = availableModels.find(
                (m) =>
                  m.id.endsWith(`/${defaultValue}`) || m.id === defaultValue,
              );
              if (matchingModel) {
                defaultModelId = matchingModel.id;
              }
            }
          }
        }

        // Last resort: first available model
        if (!defaultModelId && availableModels.length > 0) {
          defaultModelId = availableModels[0].id;
        }
      }

      setDefaultModel(defaultModelId || "");
      setIsConnected(true);

      // Only show success toast if we actually started a new server
      const health = await checkServerHealth();
      if (health.running) {
        await showToast({
          style: Toast.Style.Success,
          title: "Connected to OpenCode",
          message: `Version ${health.version || "unknown"}`,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setIsConnected(false);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to connect to OpenCode",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();
  }, [connect]);

  return {
    isLoading,
    isConnected,
    error,
    models,
    modelGroups,
    defaultModel,
    client,
    reconnect: connect,
  };
}
