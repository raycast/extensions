import { useCallback, useEffect, useState } from "react";
import { getDirectoryContent, getShowDetailLocalStorage, ShowDetailKey } from "../utils/ui-utils";
import { DirectoryInfo, LocalDirectoryKey, SortBy } from "../types/directory-info";
import { checkDirectoryValid, checkIsFolder } from "../utils/common-utils";
import { Alert, confirmAlert, Icon, LocalStorage } from "@raycast/api";
import { FileContentInfo, FolderPageItem } from "../types/file-content-info";
import { getOpenFinderWindowPath } from "../utils/applescript-utils";
import fse from "fs-extra";

//for refresh useState
export const refreshNumber = () => {
  return Date.now();
};

//open common directory
export const getIsShowDetail = (refreshDetail: number, showDetailKey: ShowDetailKey) => {
  const [showDetail, setShowDetail] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    setShowDetail(await getShowDetailLocalStorage(showDetailKey));
  }, [refreshDetail]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return showDetail;
};

export const getCommonDirectory = (
  refresh: number,
  sortBy: string,
  showOpenDirectory: boolean,
  localDirectoryKey: LocalDirectoryKey
) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [commonDirectory, setCommonDirectory] = useState<DirectoryInfo[]>([]);
  const [openDirectory, setOpenDirectory] = useState<DirectoryInfo[]>([]);

  const fetchData = useCallback(async () => {
    if (showOpenDirectory) {
      setOpenDirectory(await getOpenFinderWindowPath());
    }
    const _localDirectory = await getDirectory(localDirectoryKey, sortBy);
    const validDirectory = checkDirectoryValid(_localDirectory);
    setCommonDirectory(validDirectory);

    setLoading(false);

    await LocalStorage.setItem(localDirectoryKey, JSON.stringify(validDirectory));
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { commonDirectory: commonDirectory, openDirectory: openDirectory, loading: loading };
};

export const getDirectoryInfo = (directoryPath: string, updateDetail = 0) => {
  const [directoryInfo, setDirectoryInfo] = useState<FileContentInfo>({} as FileContentInfo);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(true);
  const fetchData = useCallback(async () => {
    setIsDetailLoading(true);
    setDirectoryInfo(getDirectoryContent(directoryPath));
    setIsDetailLoading(false);
  }, [updateDetail, directoryPath]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { directoryInfo: directoryInfo, isDetailLoading: isDetailLoading };
};

export function getFolderByPath(folderPath: string, isOpenDirectory: boolean) {
  const [folders, setFolders] = useState<FolderPageItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const fetchData = useCallback(async () => {
    console.debug(folderPath);
    const files = fse.readdirSync(folderPath);
    const _folders: FolderPageItem[] = [];
    if (isOpenDirectory) {
      files.forEach((value) => {
        if (!value.startsWith(".")) {
          _folders.push({ name: value, isFolder: checkIsFolder(folderPath + "/" + value) });
        }
      });
    } else {
      files.forEach((value) => {
        if (checkIsFolder(folderPath + "/" + value)) {
          _folders.push({ name: value, isFolder: true });
        }
      });
    }
    setFolders(_folders);

    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { folders: folders, loading: loading };
}

export async function getDirectory(key: string, sortBy: string) {
  const _localDirectory = await LocalStorage.getItem(key);
  const _commonDirectory: DirectoryInfo[] = typeof _localDirectory == "string" ? JSON.parse(_localDirectory) : [];
  if (sortBy === SortBy.NameUp) {
    _commonDirectory.sort(function (a, b) {
      return b.name.toUpperCase() < a.name.toUpperCase() ? 1 : -1;
    });
  } else if (sortBy === SortBy.NameDown) {
    _commonDirectory.sort(function (a, b) {
      return b.name.toUpperCase() > a.name.toUpperCase() ? 1 : -1;
    });
  }
  return _commonDirectory;
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
