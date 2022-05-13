import { useCallback, useEffect, useState } from "react";
import { DirectoryWithFileInfo, FileInfo } from "../utils/directory-info";
import {
  checkDirectoryValid,
  commonPreferences,
  getDirectoryFiles,
  getFileShowNumber,
  getLocalStorage,
  isEmpty,
} from "../utils/common-utils";
import { LocalStorageKey, SortBy } from "../utils/constants";
import { Alert, confirmAlert, Icon, LocalStorage, showToast, Toast } from "@raycast/api";
import { copyFileByPath } from "../utils/applescript-utils";
import { getFileContent } from "../utils/get-file-preview";

//for refresh useState
export const refreshNumber = () => {
  return new Date().getTime();
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
  const { fileShowNumber, sortBy } = commonPreferences();

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
  const [directoryInfo, setDirectoryInfo] = useState<string>("");
  const fetchData = useCallback(async () => {
    if (isEmpty(fileInfo.path)) {
      return;
    }
    setDirectoryInfo(await getFileContent(fileInfo));
  }, [updateDetail, fileInfo]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return directoryInfo;
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
