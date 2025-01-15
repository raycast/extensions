import { CoreV1Api } from "@kubernetes/client-node";
import { useCachedState } from "@raycast/utils";
import { createContext, useContext, useEffect } from "react";
import { listNamespaces } from "../api/coreV1";
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
  const { currentContext, getApiClient } = useKubernetesContext();

  const [namespaces, setNamespaces] = useCachedState<string[]>(currentContext, ["default"], {
    cacheNamespace: "kubernetes-namespaces",
  });
  const [currentNamespace, setCurrentNamespace] = useCachedState<string>(currentContext, "default", {
    cacheNamespace: "kubernetes-current-namespace",
  });

  useEffect(() => {
    const fetchNamespaces = async () => {
      const result = await listNamespaces(getApiClient(CoreV1Api));
      const currentNamespaces = result.map((ns) => ns.metadata?.name ?? "");

      // Don't set the namespaces if it hasn't changed to avoid unnecessary
      // re-renders of the `NamespaceDropdown` component.
      //
      // This is important because the `NamespaceDropdown` component will
      // trigger the `onChange` event when the `namespaces` prop changes. Which
      // will override the current namespace to the first element in the list.
      if (namespaces.length === currentNamespaces.length && namespaces.every((ns, i) => ns === currentNamespaces[i])) {
        return;
      }
      setNamespaces(currentNamespaces);
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
