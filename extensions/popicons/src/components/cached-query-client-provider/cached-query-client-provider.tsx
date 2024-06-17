import { LocalStorage } from "@raycast/api";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  },
});

interface AsyncStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
  removeItem: (key: string) => Promise<void>;
}

const Storage: AsyncStorage = {
  getItem: async (key: string) => {
    return (await LocalStorage.getItem<string>(key)) ?? null;
  },
  setItem: async (key: string, value: string) => {
    return await LocalStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    return await LocalStorage.removeItem(key);
  },
};

const asyncStoragePersister = createAsyncStoragePersister({
  storage: Storage,
});

export function CachedQueryClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister }}>
      {children}
    </PersistQueryClientProvider>
  );
}
