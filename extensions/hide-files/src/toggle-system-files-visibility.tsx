import { LocalStorage, showHUD } from "@raycast/api";
import { toggleFinderFilesVisibility } from "./utils/common-utils";
import { LocalStorageKey } from "./utils/constants";

export default async () => {
  const localStorage = await LocalStorage.getItem<boolean>(LocalStorageKey.LOCAL_HIDE_TOGGLE);
  const currentState = typeof localStorage === "undefined" ? false : localStorage;
  await showHUD(`${currentState ? "Hiding" : "Showing"} hidden files…`);
  await toggleFinderFilesVisibility(!currentState);
  await LocalStorage.setItem(LocalStorageKey.LOCAL_HIDE_TOGGLE, !currentState);
};
