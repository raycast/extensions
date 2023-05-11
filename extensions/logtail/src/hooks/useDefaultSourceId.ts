import { LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { LogTail } from "../lib/logtail";
import { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";

export type UseDefaultSourceIdResult = UseCachedPromiseReturnType<string, undefined> & {
  removeDefaultSourceId: () => Promise<void>;
  setDefaultSourceId: (sourceId: string) => Promise<void>;
};

export const useDefaultSourceId = (): UseDefaultSourceIdResult => {
  const result = useCachedPromise(() => LocalStorage.getItem<string>(LogTail.DEFAULT_SOURCE_ID_CACHE_KEY));

  return {
    ...result,
    removeDefaultSourceId: async () => {
      await LocalStorage.removeItem(LogTail.DEFAULT_SOURCE_ID_CACHE_KEY);
    },
    setDefaultSourceId: async (sourceId: string) => {
      await LocalStorage.setItem(LogTail.DEFAULT_SOURCE_ID_CACHE_KEY, sourceId);
    },
  };
};
