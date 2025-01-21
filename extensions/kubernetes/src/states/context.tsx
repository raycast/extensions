import { ApiType, Configuration, Context, KubeConfig } from "@kubernetes/client-node";
import { createContext, useContext, useEffect, useRef, useState } from "react";

export type ApiConstructor<T extends ApiType> = new (config: Configuration) => T;

type KubernetesContextContextType = {
  kubeConfig: KubeConfig;
  contexts: Context[];
  currentContext: string;
  setContexts: React.Dispatch<React.SetStateAction<Context[]>>;
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
  const kubeConfig = useRef(new KubeConfig());
  kubeConfig.current.loadFromDefault();

  const [contexts, setContexts] = useState<Context[]>(kubeConfig.current.getContexts());
  const [currentContext, setCurrentContext] = useState<string>(kubeConfig.current.getCurrentContext());

  const apiClients = useRef(new Map<string, ApiType>());

  const getApiClient = <T extends ApiType>(apiClientType: ApiConstructor<T>): T => {
    const apiType = apiClientType.name;

    if (apiClients.current.has(apiType)) {
      return apiClients.current.get(apiType) as T;
    }

    const client = kubeConfig.current.makeApiClient(apiClientType);
    apiClients.current.set(apiType, client);
    return client;
  };

  useEffect(() => {
    if (currentContext) {
      kubeConfig.current.setCurrentContext(currentContext);
      apiClients.current.clear();
    }
  }, [currentContext]);

  return (
    <KubernetesContextContext.Provider
      value={{
        kubeConfig: kubeConfig.current,
        contexts,
        currentContext,
        setContexts,
        setCurrentContext,
        getApiClient,
      }}
    >
      {children}
    </KubernetesContextContext.Provider>
  );
};
