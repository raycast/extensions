import { useCachedPromise } from "@raycast/utils";
import { LocalStorage } from "@raycast/api";
import { CacheKey } from "../utils/constants";

export const useShowDetail = () => {
  return useCachedPromise(() => {
    return LocalStorage.getItem<number>(CacheKey.ShowDetail);
  }, []);
};
