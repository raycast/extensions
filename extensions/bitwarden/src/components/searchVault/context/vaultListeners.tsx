import { createContext, MutableRefObject, ReactNode, useContext, useMemo, useRef } from "react";
import { Item } from "~/types/vault";
import { FailedToLoadVaultItemsError } from "~/utils/errors";

export type ItemListener = (item: Item | FailedToLoadVaultItemsError) => void;

export type VaultListenersContextType = {
  listeners: MutableRefObject<Map<string, ItemListener>>;
  subscribeItem: (itemId: string, listener: ItemListener) => () => void;
  publishItems: (items: Item[] | FailedToLoadVaultItemsError) => void;
};

const VaultListenersContext = createContext<VaultListenersContextType | null>(null);

const VaultListenersProvider = ({ children }: { children: ReactNode }) => {
  const listeners = useRef(new Map<string, ItemListener>());

  const publishItems = (itemsOrError: Item[] | FailedToLoadVaultItemsError) => {
    if (itemsOrError instanceof FailedToLoadVaultItemsError) {
      listeners.current.forEach((listener) => listener(itemsOrError));
    } else {
      listeners.current.forEach((listener, itemId) => {
        const item = itemsOrError.find((item) => item.id === itemId);
        if (item) listener(item);
      });
    }
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
  if (context == null) throw new Error("useVaultItemPublisher must be used within a VaultListenersProvider");

  return context.publishItems;
};

/** Allows you to subscribe to a specific item and get notified when it changes. */
export const useVaultItemSubscriber = () => {
  const context = useContext(VaultListenersContext);
  if (context == null) throw new Error("useVaultItemSubscriber must be used within a VaultListenersProvider");

  return (itemId: string) => {
    let timeoutId: NodeJS.Timeout;

    return new Promise<Item>((resolve, reject) => {
      const unsubscribe = context.subscribeItem(itemId, (itemOrError) => {
        try {
          unsubscribe();
          if (itemOrError instanceof FailedToLoadVaultItemsError) {
            throw itemOrError;
          }
          resolve(itemOrError);
          clearTimeout(timeoutId);
        } catch (error) {
          reject(error);
        }
      });

      timeoutId = setTimeout(() => {
        unsubscribe();
        reject(new SubscriberTimeoutError());
      }, 15000);
    });
  };
};

class SubscriberTimeoutError extends Error {
  constructor() {
    super("Timed out waiting for item");
    this.name = "SubscriberTimeoutError";
  }
}

export default VaultListenersProvider;
