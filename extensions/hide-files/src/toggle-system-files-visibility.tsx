import { LocalStorage, showHUD } from "@raycast/api";
import { toggleFinderFilesVisibility } from "./utils/common-utils";
import { LocalStorageKey } from "./utils/constants";

/**
 *
 *@user koinzhang
 *@email koinzhang@gmail.com
 *@date 2022-04-21
 *
 **/
export default async () => {
  const localStorage = await LocalStorage.getItem<boolean>(LocalStorageKey.LOCAL_HIDE_TOGGLE);
  const currentState = typeof localStorage === "undefined" ? true : localStorage;
  await showHUD(`System hidden files are ${currentState ? "hidden" : "shown"}`);
  await toggleFinderFilesVisibility(!currentState);
  await LocalStorage.setItem(LocalStorageKey.LOCAL_HIDE_TOGGLE, !currentState);
};
