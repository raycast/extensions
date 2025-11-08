import { useState, useEffect } from "react";
import { AIProvider } from "../../providers/base";
import { getProvider } from "../../providers";
import { ProviderError } from "../../utils/errors";
import { ERROR_MESSAGES } from "../../core/constants";

export function useProvider() {
  const [provider, setProvider] = useState<AIProvider | null>(null);
  const [isProviderReady, setIsProviderReady] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);

  useEffect(() => {
    initializeProvider();
  }, []);

  const initializeProvider = async () => {
    try {
      setProviderError(null);

      const providerInstance = await getProvider();
      const isAvailable = await providerInstance.isAvailable();

      if (!isAvailable) {
        throw new ProviderError(ERROR_MESSAGES.PROVIDER_UNAVAILABLE);
      }

      setProvider(providerInstance);
      setIsProviderReady(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to initialize provider";
      setProviderError(errorMessage);
      setIsProviderReady(false);
    }
  };

  const refreshProvider = () => {
    setProvider(null);
    setIsProviderReady(false);
    initializeProvider();
  };

  return {
    provider,
    isProviderReady,
    providerError,
    refreshProvider,
  };
}
