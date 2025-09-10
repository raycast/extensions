import { useState, useEffect, useCallback } from "react";
import {
  getAllContexts,
  getCurrentContext,
  switchToContext,
  setContextNamespace,
  switchToContextWithNamespace,
  getAllAvailableNamespaces,
  getKubeconfigInfo,
} from "../utils/kubeconfig-direct";
import { KubernetesContext } from "../types";

/**
 * Hook for kubeconfig availability and basic info
 */
export function useKubeconfigInfo() {
  const [info, setInfo] = useState({
    path: "",
    available: false,
    contextCount: 0,
    currentContext: null as string | null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setError(null);

    try {
      const kubeconfigInfo = getKubeconfigInfo();
      setInfo(kubeconfigInfo);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    info,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for current context
 */
export function useCurrentKubeContext() {
  const [currentContext, setCurrentContext] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setError(null);

    try {
      const current = getCurrentContext();
      setCurrentContext(current);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    currentContext,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for all contexts
 */
export function useKubeContexts() {
  const [contexts, setContexts] = useState<KubernetesContext[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setError(null);

    try {
      const allContexts = getAllContexts();
      setContexts(allContexts);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    contexts,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for available namespaces
 */
export function useNamespaces() {
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setError(null);

    try {
      const availableNamespaces = getAllAvailableNamespaces();
      setNamespaces(availableNamespaces);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    namespaces,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for context switching operations
 */
export function useContextSwitcher() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const switchContext = useCallback(async (contextName: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const success = switchToContext(contextName);
      if (!success) {
        throw new Error(`Failed to switch to context: ${contextName}`);
      }
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const switchContextWithNamespace = useCallback(async (contextName: string, namespace?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const success = switchToContextWithNamespace(contextName, namespace);
      if (!success) {
        throw new Error(
          `Failed to switch to context: ${contextName}${namespace ? ` with namespace: ${namespace}` : ""}`,
        );
      }
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setNamespace = useCallback(async (contextName: string, namespace: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const success = setContextNamespace(contextName, namespace);
      if (!success) {
        throw new Error(`Failed to set namespace for context: ${contextName}`);
      }
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    switchContext,
    switchContextWithNamespace,
    setNamespace,
    isLoading,
    error,
  };
}

/**
 * Combined hook for complete kubeconfig management
 */
export function useKubeconfig() {
  const info = useKubeconfigInfo();
  const currentContext = useCurrentKubeContext();
  const contexts = useKubeContexts();
  const namespaces = useNamespaces();
  const switcher = useContextSwitcher();

  const refresh = useCallback(() => {
    info.refresh();
    currentContext.refresh();
    contexts.refresh();
    namespaces.refresh();
  }, [info, currentContext, contexts, namespaces]);

  const switchContext = useCallback(
    async (contextName: string) => {
      const success = await switcher.switchContext(contextName);
      if (success) {
        // Refresh current context after successful switch
        currentContext.refresh();
        contexts.refresh();
      }
      return success;
    },
    [switcher, currentContext, contexts],
  );

  const switchContextWithNamespace = useCallback(
    async (contextName: string, namespace?: string) => {
      const success = await switcher.switchContextWithNamespace(contextName, namespace);
      if (success) {
        // Refresh all data after successful switch
        currentContext.refresh();
        contexts.refresh();
        namespaces.refresh();
      }
      return success;
    },
    [switcher, currentContext, contexts, namespaces],
  );

  return {
    // Info
    kubeconfigInfo: info.info,
    isKubeconfigAvailable: info.info.available,

    // Current context
    currentContext: currentContext.currentContext,

    // All contexts
    contexts: contexts.contexts,

    // Available namespaces
    namespaces: namespaces.namespaces,

    // Loading states
    isLoading:
      info.isLoading || currentContext.isLoading || contexts.isLoading || namespaces.isLoading || switcher.isLoading,

    // Errors
    error: info.error || currentContext.error || contexts.error || namespaces.error || switcher.error,

    // Operations
    switchContext,
    switchContextWithNamespace,
    setNamespace: switcher.setNamespace,
    refresh,
  };
}
