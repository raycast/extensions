import { CallbackTypes, Context, Provider, StoreContext } from "@today/common";
import React from "react";
import { Cache } from "@raycast/api";
import { Store } from "@today/common/types";

const cache = new Cache();

const getCacheItem = (key: string) => {
  const rawItem = cache.get(key);
  const item = rawItem ? JSON.parse(rawItem) : rawItem;

  return item;
};

export const StoreProvider = ({ children }: React.ComponentProps<Provider>): React.ReactElement => {
  const setItem = React.useCallback(<K extends keyof Store>(key: K, rawValue: CallbackTypes[K]) => {
    let value = rawValue;

    if (typeof value === "function") {
      const prevValue = getCacheItem(key);
      value = value(prevValue);
    }

    cache.set(key, JSON.stringify(value));
  }, []);

  const clear = React.useCallback(() => {
    cache.clear();
  }, []);

  const [store, setStore] = React.useState<Context>({
    setItem,
    clear,
    hydrated: true,
    config: getCacheItem("config") || {},
    databases: getCacheItem("databases") || {},
    tasks: getCacheItem("tasks") || [],
    selectedItem: "",
    me: undefined,
  });

  React.useEffect(() => {
    const unsubscribe = cache.subscribe((key, rawValue) => {
      if (!key) return;

      if (!(key in store)) return;

      const value = rawValue ? JSON.parse(rawValue) : rawValue;

      setStore((prevStore) => ({
        ...prevStore,
        [key]: value,
      }));
    });

    return () => {
      unsubscribe();
    };
  });

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
};

export const withStoreProvider = (Component: React.FunctionComponent<object>) => (props: object) => (
  <StoreProvider>
    <Component {...props} />
  </StoreProvider>
);
