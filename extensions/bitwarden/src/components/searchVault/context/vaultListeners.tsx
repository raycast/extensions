import { createContext, MutableRefObject, ReactNode, useContext, useMemo, useRef } from "react";
import { Item } from "~/types/vault";

export type ItemListener = (item: Item) => void;

export type VaultListenersContextType = {
  listeners: MutableRefObject<Map<string, ItemListener>>;
  subscribeItem: (itemId: string, listener: ItemListener) => () => void;
  publishItems: (items: Item[]) => void;
};

const VaultListenersContext = createContext<VaultListenersContextType | null>(null);

const VaultListenersProvider = ({ children }: { children: ReactNode }) => {
  const listeners = useRef(new Map<string, ItemListener>());

  const publishItems = (items: Item[]) => {
    listeners.current.forEach((listener, itemId) => {
      const item = items.find((item) => item.id === itemId);
      if (item) listener(item);
    });
  };

  const subscribeItem = (itemId: string, listener: ItemListener) => {
    listeners.current.set(itemId, listener);
    return () => {
      listeners.current.delete(itemId);
    };
  };

  const memoizedValue = useMemo(() => ({ listeners, publishItems, subscribeItem }), []);

  return <VaultListenersContext.Provider value={memoizedValue}>{children}</VaultListenersContext.Provider>;
};

export const useVaultItemPublisher = () => {
  const context = useContext(VaultListenersContext);
  if (context == null) {
    throw new Error("useGetItemPublisher must be used within a GetVaultItemProvider");
  }
  return context.publishItems;
};

/** Allows you to subscribe to a specific item and get notified when it changes. */
export const useVaultItemSubscriber = () => {
  const context = useContext(VaultListenersContext);

  if (context == null) {
    throw new Error("useGetItemSubscriber must be used within a GetVaultItemProvider");
  }

  return (itemId: string) => {
    return new Promise<Item>((resolve) => {
      const unsubscribe = context.subscribeItem(itemId, (item) => {
        unsubscribe();
        resolve(item);
      });
    });
  };
};

export default VaultListenersProvider;
