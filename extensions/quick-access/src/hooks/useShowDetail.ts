import { LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

async function getIsShowDetail() {
  const localStorage = await LocalStorage.getItem<boolean>("isShowDetail");
  return typeof localStorage === "undefined" ? true : localStorage;
}

export function useShowDetail() {
  return useCachedPromise(() => {
    return getIsShowDetail();
  }, []);
}
