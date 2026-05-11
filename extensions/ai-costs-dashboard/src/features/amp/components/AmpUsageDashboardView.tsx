import { LocalStorage } from "@raycast/api";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { AmpUsageDashboardContent } from "./AmpUsageDashboardContent";
import {
  createLocalStoragePersister,
  QUERY_CACHE_BUSTER,
  QUERY_CACHE_MAX_AGE_MS,
} from "../../common/lib/queryPersistence/queryPersistence";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: QUERY_CACHE_MAX_AGE_MS,
      retry: false,
      staleTime: 30_000,
    },
  },
});

const persister = createLocalStoragePersister({
  getItem: (key) => LocalStorage.getItem<string>(key),
  removeItem: (key) => LocalStorage.removeItem(key),
  setItem: (key, value) => LocalStorage.setItem(key, value),
});

export const AmpUsageDashboardView = () => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      buster: QUERY_CACHE_BUSTER,
      maxAge: QUERY_CACHE_MAX_AGE_MS,
      persister,
    }}
  >
    <AmpUsageDashboardContent />
  </PersistQueryClientProvider>
);
