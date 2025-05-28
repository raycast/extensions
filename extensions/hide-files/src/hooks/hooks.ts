import { useCallback, useEffect, useState } from "react";
import { checkDirectoryValid, getLocalStorage, isEmpty } from "../utils/common-utils";
import { LocalStorageKey } from "../utils/constants";
import { DirectoryInfo } from "../utils/directory-info";
import { Alert, confirmAlert, Icon, LocalStorage } from "@raycast/api";

//for refresh useState
export const refreshNumber = () => {
  return new Date().getTime();
};

export const getHiddenFiles = (refresh: number) => {
  const [localHiddenDirectory, setLocalHiddenDirectory] = useState<DirectoryInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    const _localstorage = await getLocalStorage(LocalStorageKey.LOCAL_HIDE_DIRECTORY);
    let localDirectory: DirectoryInfo[] = [];
    if (!isEmpty(_localstorage)) {
      localDirectory = JSON.parse(_localstorage) as DirectoryInfo[];
    }

    //check invalid directory
    const _validDirectory = checkDirectoryValid(localDirectory);
    setLocalHiddenDirectory(_validDirectory);
    setLoading(false);
    await LocalStorage.setItem(LocalStorageKey.LOCAL_HIDE_DIRECTORY, JSON.stringify(_validDirectory));
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { localHiddenDirectory: localHiddenDirectory, loading: loading };
};

export const alertDialog = async (
  icon: Icon,
  title: string,
  message: string,
  confirmTitle: string,
  confirmAction: () => void,
  cancelAction?: () => void,
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
