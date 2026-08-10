import { LocalStorage } from "@raycast/api";
import { LocalStorageKey } from "../utils/constants";
import { usePromise } from "@raycast/utils";

export const useIconConfig = () => {
  return usePromise(() => {
    return LocalStorage.getItem<string>(LocalStorageKey.ICON_CONFIG);
  });
};
