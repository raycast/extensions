import { useCallback, useEffect, useState } from "react";
import { DirectoryWithFileInfo, FileInfo, FolderPageItem } from "../types/types";
import {
  checkDirectoryValid,
  getDirectoryFiles,
  getFileShowNumber,
  getLocalStorage,
  isDirectory,
  isEmpty,
} from "../utils/common-utils";
import { LocalStorageKey, SortBy } from "../utils/constants";
import { Alert, confirmAlert, getPreferenceValues, Icon, LocalStorage, showToast, Toast } from "@raycast/api";
import { copyFileByPath } from "../utils/applescript-utils";
import { getFileContent } from "../utils/get-file-preview";
import { FileContentInfo, fileContentInfoInit } from "../types/file-content-info";
import { Preferences } from "../types/preferences";
import fse from "fs-extra";

//for refresh useState
export const refreshNumber = () => {
  return Date.now();
};

//get is show detail
export const getIsShowDetail = (refreshDetail: number) => {
  const [showDetail, setShowDetail] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    const localStorage = await LocalStorage.getItem<boolean>("isShowDetail");
    const _showDetailKey = typeof localStorage === "undefined" ? true : localStorage;
    setShowDetail(_showDetailKey);
  }, [refreshDetail]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return showDetail;
};

//get local directory with files
export const localDirectoryWithFiles = (refresh: number) => {
  const [directoryWithFiles, setDirectoryWithFiles] = useState<DirectoryWithFileInfo[]>([]);
  const [allFilesNumber, setAllFilesNumber] = useState<number>(-1);
  const [loading, setLoading] = useState<boolean>(true);
  const { fileShowNumber, sortBy } = getPreferenceValues<Preferences>();

  const fetchData = useCallback(async () => {
    const _localstorage = await getLocalStorage(LocalStorageKey.LOCAL_PIN_DIRECTORY);
    const localDirectory = isEmpty(_localstorage) ? [] : JSON.parse(_localstorage);

    //check if directory is valid
    const validDirectory = checkDirectoryValid(localDirectory);
    if (sortBy === SortBy.NameUp) {
      validDirectory.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });
    } else if (sortBy === SortBy.NameDown) {
      validDirectory.sort(function (a, b) {
        return b.name.localeCompare(a.name);
      });
    }

    //get directory files
    const _pinnedDirectoryContent: DirectoryWithFileInfo[] = [];
    const _fileShowNumber = getFileShowNumber(fileShowNumber);
    let _allFilesNumber = 0;
    validDirectory.forEach((value) => {
      const files =
        _fileShowNumber === -1
          ? getDirectoryFiles(value.path + "/")
          : getDirectoryFiles(value.path + "/").slice(0, _fileShowNumber);
      _pinnedDirectoryContent.push({
        directory: value,
        files: files,
      });
      _allFilesNumber = _allFilesNumber + files.length;
    });
    setAllFilesNumber(_allFilesNumber);
    setDirectoryWithFiles(_pinnedDirectoryContent);
    setLoading(false);

    await LocalStorage.setItem(LocalStorageKey.LOCAL_PIN_DIRECTORY, JSON.stringify(validDirectory));
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    directoryWithFiles: directoryWithFiles,
    allFilesNumber: allFilesNumber,
    loading: loading,
  };
};

//get file or folder info
export const getFileInfoAndPreview = (fileInfo: FileInfo, updateDetail = 0) => {
  const [fileContentInfo, setFileContentInfo] = useState<FileContentInfo>(fileContentInfoInit);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(true);
  const fetchData = useCallback(async () => {
    if (isEmpty(fileInfo.path)) {
      return;
    }
    setIsDetailLoading(true);
    setFileContentInfo(await getFileContent(fileInfo));
    setIsDetailLoading(false);
  }, [updateDetail, fileInfo]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { fileContentInfo: fileContentInfo, isDetailLoading: isDetailLoading };
};

//get local directory with files
export const copyLatestFile = (autoCopyLatestFile: boolean, pinnedDirectoryContent: DirectoryWithFileInfo[]) => {
  const [isCopy, setIsCopy] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    if (autoCopyLatestFile && pinnedDirectoryContent.length > 0 && !isCopy) {
      const noEmptyDirectoryContent = pinnedDirectoryContent.filter((value) => {
        return value.files.length != 0;
      });
      if (noEmptyDirectoryContent.length > 0) {
        const copyResult = await copyFileByPath(noEmptyDirectoryContent[0].files[0].path);
        if (isEmpty(copyResult)) {
          await showToast(Toast.Style.Success, `${noEmptyDirectoryContent[0].files[0].name} is copied to clipboard!`);
        } else {
          await showToast(Toast.Style.Failure, copyResult + ".");
        }
      }
      setIsCopy(true);
    }
  }, [pinnedDirectoryContent]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);
};

export function getFolderByPath(folderPath: string) {
  const [folders, setFolders] = useState<FolderPageItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const fetchData = useCallback(async () => {
    const files = fse.readdirSync(folderPath);
    const _folders: FolderPageItem[] = [];
    files.forEach((value) => {
      if (!value.startsWith(".")) {
        _folders.push({ name: value, isFolder: isDirectory(folderPath + "/" + value) });
      }
    });
    setFolders(_folders);

    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { folders: folders, loading: loading };
}

export const alertDialog = async (
  icon: Icon,
  title: string,
  message: string,
  confirmTitle: string,
  confirmAction: () => void,
  cancelAction?: () => void
) => {
  const options: Alert.Options = {
    icon: icon,
    title: title,
    message: message,
    primaryAction: {
      title: confirmTitle,
      onAction: confirmAction,
    },
    dismissAction: {
      title: "Cancel",
      onAction: () => cancelAction,
    },
  };
  await confirmAlert(options);
};
