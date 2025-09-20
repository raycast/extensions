import { useCallback, useEffect, useState } from "react";
import { LocalStorage } from "@raycast/api";
import { LocalStorageKey } from "../utils/constants";
import { fetchInputItem } from "../utils/input-item";

export const useInputItem = (refresh: number) => {
  const [inputItem, setInputItem] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    try {
      const itemInput = await fetchInputItem();
      setInputItem(itemInput);
      setLoading(false);
    } catch (e) {
      console.error(e);
    }
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { inputItem: inputItem, itemLoading: loading };
};

//get if show detail
export const useIsShowDetail = (refreshDetail: number) => {
  const [showDetail, setShowDetail] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    const localStorage = await LocalStorage.getItem<string>(LocalStorageKey.DETAIL_KEY);
    const _showDetailKey = typeof localStorage === "undefined" ? true : (JSON.parse(localStorage) as boolean);
    setShowDetail(_showDetailKey);
    setLoading(false);
  }, [refreshDetail]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { showDetail: showDetail, detailLoading: loading };
};
