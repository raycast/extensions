import { ApiType, Configuration, Context, KubeConfig } from "@kubernetes/client-node";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type ApiConstructor<T extends ApiType> = new (config: Configuration) => T;

type KubernetesContextContextType = {
  kubeConfig: KubeConfig;
  contexts: Context[];
  setContexts: React.Dispatch<React.SetStateAction<Context[]>>;
  currentContext: string;
  setCurrentContext: React.Dispatch<React.SetStateAction<string>>;
  getApiClient: <T extends ApiType>(apiClientType: ApiConstructor<T>) => T;
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

  const [contexts, setContexts] = useState<Context[]>(kubeConfig.getContexts());
  const [currentContext, setCurrentContext] = useState<string>(kubeConfig.getCurrentContext());

  const apiClients = useRef(new Map<string, ApiType>());
  useEffect(() => {
    if (currentContext) {
      apiClients.current.clear();
    }
  }, [currentContext]);

  const getApiClient = useCallback(<T extends ApiType>(apiClientType: ApiConstructor<T>): T => {
    const apiType = apiClientType.name;

    if (apiClients.current.has(apiType)) {
      return apiClients.current.get(apiType) as T;
    }

    const client = kubeConfig.makeApiClient(apiClientType);
    apiClients.current.set(apiType, client);
    return client;
  }, []);

  return (
    <KubernetesContextContext.Provider
      value={{
        kubeConfig,
        contexts,
        setContexts,
        currentContext,
        setCurrentContext,
        getApiClient,
      }}
    >
      {children}
    </KubernetesContextContext.Provider>
  );
};
