import { ApiException, V1Namespace } from "@kubernetes/client-node";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { createContext, useContext, useEffect, useMemo } from "react";
import { useKubernetesContext } from "./context";

type KubernetesNamespaceContextType = {
  namespaces: string[];
  setNamespaces: React.Dispatch<React.SetStateAction<string[]>>;
  currentNamespace: string;
  setCurrentNamespace: React.Dispatch<React.SetStateAction<string>>;
};

const KubernetesNamespaceContext = createContext<KubernetesNamespaceContextType | undefined>(undefined);

export const useKubernetesNamespace = (): KubernetesNamespaceContextType => {
  const context = useContext(KubernetesNamespaceContext);
  if (!context) {
    throw new Error("useKubernetesNamespace must be used within a KubernetesNamespaceProvider");
  }
  return context;
};

export const KubernetesNamespaceProvider = ({ children }: { children: React.ReactNode }) => {
  const { kubeConfig, currentContext, apiClient } = useKubernetesContext();

  const [namespaces, setNamespaces] = useCachedState<string[]>(currentContext, ["default"], {
    cacheNamespace: "kubernetes-namespaces",
  });
  const [currentNamespace, setCurrentNamespace] = useCachedState<string>(currentContext, "default", {
    cacheNamespace: "kubernetes-current-namespace",
  });

  const setNamespacesIfUnchanged = (newNamespaces: string[]) => {
    if (namespaces.length === newNamespaces.length && namespaces.every((ns, i) => ns === newNamespaces[i])) {
      return;
    }

    setNamespaces(newNamespaces);

    // Respect the default namespace in the kubeconfig.
    const defaultNamespace = kubeConfig.getContextObject(currentContext)?.namespace;
    if (defaultNamespace && newNamespaces.includes(defaultNamespace)) {
      setCurrentNamespace(defaultNamespace);
      return;
    }

    if (newNamespaces.length > 0) {
      setCurrentNamespace(newNamespaces[0]);
    } else {
      setCurrentNamespace("");
    }
  };

  const availableNamespaces = useMemo(() => {
    const preferences = getPreferenceValues();

    if (preferences.availableNamespaces) {
      try {
        const availableNamespaces: string[] = JSON.parse(preferences.availableNamespaces)[currentContext] ?? [];
        if (availableNamespaces.length > 0) {
          setNamespacesIfUnchanged(availableNamespaces);
        }
        return availableNamespaces;
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: `Invalid value for "Available Namespaces"`,
          message: `Expected a JSON object with the context as the key and an array of namespaces as the value. Got "${preferences.availableNamespaces}".`,
        });
      }
    }

    return [];
  }, []);

  useEffect(() => {
    // Don't fetch the namespaces if the available namespaces are set in the preferences.
    if (availableNamespaces.length > 0) {
      return;
    }

    const fetchNamespaces = async () => {
      try {
        const result = await apiClient.list<V1Namespace>("v1", "Namespace");

        const currentNamespaces = result.items.map((ns) => ns.metadata?.name ?? "");
        setNamespacesIfUnchanged(currentNamespaces);
      } catch (error) {
        if (error instanceof ApiException && error.code === 403) {
          showToast({
            style: Toast.Style.Failure,
            title: "No permissions to list namespaces",
            message: `Consider configuring the "Available Namespaces" for the context "${currentContext}" in the extension settings.`,
          });
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to list namespaces",
            message: `${error}`,
          });
        }

        setNamespaces([]);
      }
    };

    fetchNamespaces();
  }, [currentContext]);

  return (
    <KubernetesNamespaceContext.Provider
      value={{
        namespaces,
        setNamespaces,
        currentNamespace,
        setCurrentNamespace,
      }}
    >
      {children}
    </KubernetesNamespaceContext.Provider>
  );
};
