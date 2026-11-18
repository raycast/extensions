import React, { useCallback, useEffect, useMemo } from "react";
import z from "zod";
import { useZodLocalStorage } from "../../hooks/use-zod-local-storage";
import { Store } from "../../types/store.types";
import { useStores } from "../stores-provider/stores-provider";

export interface StoreContextValue {
  store: Store | null;
  setStore: (storeId: string) => Promise<void>;
  isLoading: boolean;
}

const StoreContext = React.createContext<StoreContextValue | null>(null);

export const useStore = () => {
  const context = React.useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
};

export interface StoreProviderProps {
  children?: React.ReactNode;
}

const StoreProvider = ({ children }: StoreProviderProps) => {
  const { stores } = useStores();
  const { isLoading, value, setValue } = useZodLocalStorage("store-id", z.string().min(1).nullable(), null);

  const store = useMemo(() => {
    if (!value) return null;
    return stores.find((s) => s.id === value) || null;
  }, [stores, value]);

  const setStore = useCallback(
    async (storeId: string) => {
      if (!storeId || storeId === value) return;
      await setValue(storeId);
    },
    [setValue, value],
  );

  useEffect(() => {
    if (isLoading || store || stores.length === 0) return;
    setStore(stores[0].id);
  }, [isLoading, setStore, store, stores]);

  const providerValue = useMemo<StoreContextValue>(
    () => ({
      isLoading,
      setStore,
      store,
    }),
    [isLoading, setStore, store],
  );

  return <StoreContext.Provider value={providerValue}>{children}</StoreContext.Provider>;
};

export default (props: StoreProviderProps) => {
  const parentCtx = React.useContext(StoreContext);
  if (parentCtx) {
    return props.children;
  }
  return <StoreProvider {...props} />;
};
