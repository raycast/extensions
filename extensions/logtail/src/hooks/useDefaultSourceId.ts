import { LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Logtail } from "../lib/logtail";
import { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";

export type UseDefaultSourceIdResult = UseCachedPromiseReturnType<string, undefined> & {
  removeDefaultSourceId: () => Promise<void>;
  setDefaultSourceId: (sourceId: string) => Promise<void>;
};

export const useDefaultSourceId = (): UseDefaultSourceIdResult => {
  const result = useCachedPromise(() => LocalStorage.getItem<string>(Logtail.DEFAULT_SOURCE_ID_CACHE_KEY));

  return {
    ...result,
    removeDefaultSourceId: async () => {
      await LocalStorage.removeItem(Logtail.DEFAULT_SOURCE_ID_CACHE_KEY);
      await result.mutate(undefined, { optimisticUpdate: () => undefined });
    },
    setDefaultSourceId: async (sourceId: string) => {
      await LocalStorage.setItem(Logtail.DEFAULT_SOURCE_ID_CACHE_KEY, sourceId);
      await result.mutate(undefined, { optimisticUpdate: () => sourceId });
    },
  };
};
