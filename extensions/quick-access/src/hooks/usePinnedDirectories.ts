import { useCachedPromise } from "@raycast/utils";
import { DirectoryWithFileInfo, TypeDirectory, TypeDirectoryEnum } from "../types/types";
import { checkDirectoryValid, getDirectoryFiles, getLocalStorage, isEmpty } from "../utils/common-utils";
import { LocalStorageKey } from "../utils/constants";
import { fileShowNumber, showOpenFolders } from "../types/preferences";
import { getOpenFinderWindowPath } from "../utils/applescript-utils";

async function getPinnedDirectories() {
  const _localstorage = await getLocalStorage(LocalStorageKey.LOCAL_PIN_DIRECTORY);
  const localDirectory = isEmpty(_localstorage) ? [] : JSON.parse(_localstorage);
  //check if directory is valid
  const pinnedDirectory = checkDirectoryValid(localDirectory);

  const _pinnedDirectoryContent: DirectoryWithFileInfo[] = [];
  const _fileShowNumber = Number(fileShowNumber);
  pinnedDirectory.forEach((value) => {
    const files =
      _fileShowNumber === -1
        ? getDirectoryFiles(value.path + "/")
        : getDirectoryFiles(value.path + "/").slice(0, _fileShowNumber);
    _pinnedDirectoryContent.push({
      directory: value,
      files: files,
    });
  });

  const _openDirectoryContent: DirectoryWithFileInfo[] = [];
  if (showOpenFolders) {
    const openFolders = await getOpenFinderWindowPath();

    openFolders.forEach((openFolder) => {
      const isPinned = pinnedDirectory.some((localFolder) => {
        return localFolder.path == openFolder.path;
      });
      if (isPinned) return;

      const _fileShowNumber = Number(fileShowNumber);
      const files =
        _fileShowNumber === -1
          ? getDirectoryFiles(openFolder.path + "/")
          : getDirectoryFiles(openFolder.path + "/").slice(0, _fileShowNumber);
      _openDirectoryContent.push({
        directory: openFolder,
        files: files,
      });
    });
  }
  // get pinned directories
  const finalPinnedDirectories: TypeDirectory[] = [];
  finalPinnedDirectories.push({ type: TypeDirectoryEnum.OpenFolder, directories: _openDirectoryContent });
  finalPinnedDirectories.push({ type: TypeDirectoryEnum.PinnedFolder, directories: _pinnedDirectoryContent });
  return finalPinnedDirectories;
}

export function usePinnedDirectories() {
  return useCachedPromise(() => {
    return getPinnedDirectories();
  }, []);
}
