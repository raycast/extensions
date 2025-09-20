import { useCachedPromise } from "@raycast/utils";
import { checkDirectoryValid, getLocalStorage, isEmpty } from "../utils/common-utils";
import { LocalStorageKey } from "../utils/constants";

async function getPinnedDirectories() {
  const _localstorage = await getLocalStorage(LocalStorageKey.LOCAL_PIN_DIRECTORY);
  const localDirectory = isEmpty(_localstorage) ? [] : JSON.parse(_localstorage);
  //check if directory is valid
  return checkDirectoryValid(localDirectory);
}

export function usePinnedDirectoriesSetup() {
  return useCachedPromise(() => {
    return getPinnedDirectories();
  }, []);
}
