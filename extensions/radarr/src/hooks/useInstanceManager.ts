import { useState, useEffect, useCallback, useMemo } from "react";
import { getActiveRadarrInstance, getRadarrInstances } from "../config";
import type { RadarrInstance } from "../types";

export function useInstanceManager() {
  const [currentInstance, setCurrentInstanceState] = useState<RadarrInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDefaultInstance = useCallback(() => {
    try {
      const instance = getActiveRadarrInstance();
      setCurrentInstanceState(instance);
    } catch (error) {
      console.error("Failed to load default instance:", error);
      setCurrentInstanceState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDefaultInstance();
  }, [loadDefaultInstance]);

  const switchToInstance = useCallback((instance: RadarrInstance) => {
    setCurrentInstanceState(instance);
  }, []);

  const availableInstances = useMemo(() => {
    try {
      return getRadarrInstances();
    } catch {
      return [];
    }
  }, []);

  return {
    currentInstance,
    isLoading,
    availableInstances,
    switchToInstance,
  };
}
