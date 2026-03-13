import { useCachedPromise } from "@raycast/utils";
import { LocalStorage } from "@raycast/api";
import { localStorageKey } from "../utils/costants";

const getIsShowDetail = async () => {
  const localStorage = await LocalStorage.getItem<boolean>(localStorageKey.SHOW_DETAILS);
  return typeof localStorage === "undefined" ? true : localStorage;
};

export function useShowDetail() {
  return useCachedPromise(() => {
    return getIsShowDetail() as Promise<boolean>;
  });
}
