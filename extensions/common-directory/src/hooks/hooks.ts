import { useCallback, useEffect, useState } from "react";
import { getDirectoryContent, getShowDetailLocalStorage, ShowDetailKey } from "../utils/ui-utils";
import { DirectoryInfo, LocalDirectoryKey } from "../utils/directory-info";
import { getOpenFinderWindowPath } from "../utils/common-utils";
import { getDirectory } from "../open-common-directory";

//for refresh useState
export const refreshNumber = () => {
  return new Date().getTime();
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
    setCommonDirectory(await getDirectory(localDirectoryKey, sortBy));
    if (showOpenDirectory) {
      setOpenDirectory(await getOpenFinderWindowPath());
    }

    setLoading(false);
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { commonDirectory: commonDirectory, openDirectory: openDirectory, loading: loading };
};

export const getDirectoryInfo = (directoryPath: string, updateDetail = 0) => {
  const [directoryInfo, setDirectoryInfo] = useState<string>("");
  const fetchData = useCallback(async () => {
    setDirectoryInfo(getDirectoryContent(directoryPath));
  }, [updateDetail, directoryPath]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return directoryInfo;
};
