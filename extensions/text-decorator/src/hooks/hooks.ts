import { useCallback, useEffect, useState } from "react";
import { LocalStorage } from "@raycast/api";
import { fontFamily, LocalStorageKey } from "../utils/constants";
import { fetchInputItem } from "../utils/input-item";

export const getStarTextFont = (refresh: number) => {
  const [starTextFont, setStarTextFont] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    try {
      const localStorage = await LocalStorage.getItem<string>(LocalStorageKey.STAR_TEXT_FONT);
      const _starTextFont = typeof localStorage === "undefined" ? fontFamily[0].value : localStorage;
      setStarTextFont(_starTextFont);
      setLoading(false);
    } catch (e) {
      console.error(e);
    }
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { starTextFont: starTextFont, starLoading: loading };
};

export const getInputItem = (refresh: number) => {
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
export const getIsShowDetail = (refreshDetail: number) => {
  const [showDetail, setShowDetail] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    const localStorage = await LocalStorage.getItem<boolean>(LocalStorageKey.DETAIL_KEY);
    const _showDetailKey = typeof localStorage === "undefined" ? false : localStorage;
    setShowDetail(_showDetailKey);
    setLoading(false);
  }, [refreshDetail]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { showDetail: showDetail, detailLoading: loading };
};
