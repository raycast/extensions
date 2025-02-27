import { ApiType, Configuration, KubeConfig, KubernetesObjectApi } from "@kubernetes/client-node";
import { createContext, useContext, useEffect, useState } from "react";

export type ApiConstructor<T extends ApiType> = new (config: Configuration) => T;

type KubernetesContextContextType = {
  kubeConfig: KubeConfig;
  currentContext: string;
  setCurrentContext: React.Dispatch<React.SetStateAction<string>>;
  apiClient: KubernetesObjectApi;
};

const KubernetesContextContext = createContext<KubernetesContextContextType | undefined>(undefined);

export const useKubernetesContext = (): KubernetesContextContextType => {
  const context = useContext(KubernetesContextContext);
  if (!context) {
    throw new Error("useKubernetesContext must be used within a KubernetesContextProvider");
  }
  return context;
};

export const KubernetesContextProvider = ({ children }: { children: React.ReactNode }) => {
  const kubeConfig = new KubeConfig();
  kubeConfig.loadFromDefault();

  const [currentContext, setCurrentContext] = useState<string>(kubeConfig.getCurrentContext());
  const [apiClient, setApiClient] = useState<KubernetesObjectApi>(KubernetesObjectApi.makeApiClient(kubeConfig));

  useEffect(() => {
    kubeConfig.setCurrentContext(currentContext);
    setApiClient(KubernetesObjectApi.makeApiClient(kubeConfig));
  }, [currentContext]);

  return (
    <KubernetesContextContext.Provider
      value={{
        kubeConfig,
        currentContext,
        setCurrentContext,
        apiClient,
      }}
    >
      {children}
    </KubernetesContextContext.Provider>
  );
};
