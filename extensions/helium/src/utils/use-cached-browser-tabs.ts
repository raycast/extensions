import { useCachedPromise, type MutatePromise } from "@raycast/utils";
import { useCallback, useState } from "react";
import type { Tab } from "../types";
import { fetchBrowserTabs } from "./browser";

interface CachedBrowserTabsState {
  data: Tab[];
  freshTabs?: Tab[];
  isLoading: boolean;
  mutate: MutatePromise<Tab[], undefined>;
  revalidate: () => Promise<Tab[]>;
}

export function useCachedBrowserTabs(): CachedBrowserTabsState {
  const [freshTabs, setFreshTabs] = useState<Tab[]>();
  const state = useCachedPromise(fetchBrowserTabs, [], {
    initialData: [] as Tab[],
    keepPreviousData: true,
    failureToastOptions: {
      title: "Failed to Get Tabs",
    },
    onData: setFreshTabs,
  });

  const revalidate = useCallback(async () => {
    const tabs = await fetchBrowserTabs();
    setFreshTabs(tabs);
    await state.mutate(Promise.resolve(tabs), {
      optimisticUpdate: () => tabs,
      rollbackOnError: false,
      shouldRevalidateAfter: false,
    });
    return tabs;
  }, [state.mutate]);

  return {
    data: state.data ?? [],
    freshTabs,
    isLoading: state.isLoading,
    mutate: state.mutate as unknown as MutatePromise<Tab[], undefined>,
    revalidate,
  };
}
