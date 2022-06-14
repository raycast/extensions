import { useCallback, useEffect, useState } from "react";
import {
  scriptToGetBunches,
  scriptToGetBunchFolder,
  scriptToGetOpenBunches,
  scriptToGetPreferences,
  scriptToGetTaggedBunches,
} from "../utils/applescript-utils";
import { BunchesInfo, PreferencesInfo } from "../types/types";
import { isEmpty } from "../utils/common-utils";
import * as fs from "fs";
import { LocalStorage, showToast, Toast } from "@raycast/api";
import { LocalStorageKey } from "../utils/constants";
import Style = Toast.Style;

export const getBunches = (refresh: number, tag?: string) => {
  const [allBunches, setAllBunches] = useState<string[]>([]);
  const [bunches, setBunches] = useState<BunchesInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const openBunches = (await scriptToGetOpenBunches()).split(", ");
      const _bunches: BunchesInfo[] = [];
      let _allBunches: string[];
      if (tag?.startsWith("tag:")) {
        _allBunches = (await scriptToGetTaggedBunches(tag?.substring(4))).split(", ");
      } else {
        if (allBunches.length === 0) {
          _allBunches = (await scriptToGetBunches()).split(", ");
          setAllBunches(_allBunches);
        } else {
          _allBunches = allBunches;
        }
      }
      _allBunches.map((value) => {
        if (isEmpty(value)) return;
        _bunches.push({ name: value, isOpen: openBunches.includes(value) });
      });
      setBunches(_bunches);
    } catch (e) {
      await showToast(Style.Failure, String(e));
      console.error(e);
    }
    setLoading(false);
  }, [refresh, tag]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { bunches: bunches, loading: loading };
};

export const getBunchFolder = () => {
  const [bunchFolder, setBunchFolder] = useState<string>("");

  const fetchData = useCallback(async () => {
    try {
      if (isEmpty(bunchFolder) || !fs.existsSync(bunchFolder)) {
        const _bunchFolder = await scriptToGetBunchFolder();
        setBunchFolder(_bunchFolder);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { bunchFolder: bunchFolder };
};

export const getBunchPreferences = (refresh: number) => {
  const [bunchPreferences, setBunchPreferences] = useState<PreferencesInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const _preferences = await scriptToGetPreferences();
      setBunchPreferences(_preferences);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { bunchPreferences: bunchPreferences, loading: loading };
};

//get if show detail
export const getIsShowDetail = (refreshDetail: number) => {
  const [showDetail, setShowDetail] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    const localStorage = await LocalStorage.getItem<boolean>(LocalStorageKey.DETAIL_KEY);
    const _showDetailKey = typeof localStorage === "undefined" ? true : localStorage;
    setShowDetail(_showDetailKey);
  }, [refreshDetail]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { showDetail: showDetail };
};
