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
import { Alert, confirmAlert, Icon, LocalStorage, open, showToast, Toast } from "@raycast/api";
import { LocalStorageKey } from "../utils/constants";
import Style = Toast.Style;

export const getBunches = (refresh: number, tag?: string) => {
  const [allBunches, setAllBunches] = useState<string[]>([]);
  const [bunches, setBunches] = useState<BunchesInfo[]>([]);
  const [openBunches, seOpenBunches] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const openBunches = await scriptToGetOpenBunches();
      seOpenBunches(openBunches);
      const _bunches: BunchesInfo[] = [];
      let _allBunches: string[];
      if (tag?.startsWith("tag:")) {
        _allBunches = (await scriptToGetTaggedBunches(tag?.substring(4))).split(", ");
      } else {
        if (allBunches.length === 0) {
          setBunches([]);
          _allBunches = await scriptToGetBunches();
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

  return {
    bunches: bunches,
    openBunches: openBunches,
    allBunches: allBunches,
    setAllBunches: setAllBunches,
    loading: loading,
  };
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

export const bunchNotInstallAlertDialog = async () => {
  const options: Alert.Options = {
    icon: { source: "not-installed-icon.svg" },
    title: "Bunch Not Installed",
    message: "Bunch is not installed on your Mac. Please install Bunch to use this command.",
    primaryAction: {
      title: "Get Bunch",
      onAction: () => {
        open("https://bunchapp.co/download/");
      },
    },
  };
  await confirmAlert(options);
};
