import { LocalStorage } from "@raycast/api";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

const queryClient = new QueryClient();
const asyncStoragePersister = createAsyncStoragePersister({
  storage: {
    getItem: LocalStorage.getItem<string>,
    setItem: LocalStorage.setItem,
    removeItem: LocalStorage.removeItem,
  },
});

export default function CommandWrapper({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister }}>
      {children}
    </PersistQueryClientProvider>
  );
}
