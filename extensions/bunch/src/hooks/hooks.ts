import { useCallback, useEffect, useState } from "react";
import {
  scriptToGetBunches,
  scriptToGetOpenBunches,
  scriptToGetPreferences,
  scriptToGetTaggedBunches,
} from "../utils/applescript-utils";
import { BunchesInfo, PreferencesInfo } from "../types/types";
import { isEmpty } from "../utils/common-utils";

export const getBunches = (refresh: number, tag?: string) => {
  const [bunches, setBunches] = useState<BunchesInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const openBunches = (await scriptToGetOpenBunches()).split(", ");
      const _bunches: BunchesInfo[] = [];
      let allBunches: string[] = [];
      if (tag?.startsWith("tag:")) {
        allBunches = (await scriptToGetTaggedBunches(tag?.substring(4))).split(", ");
      } else if (isEmpty(tag)) {
        allBunches = (await scriptToGetBunches()).split(", ");
      }
      allBunches.map((value) => {
        if (isEmpty(value)) return;
        _bunches.push({ name: value, isOpen: openBunches.includes(value) });
      });
      setBunches(_bunches);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [refresh, tag]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { bunches: bunches, loading: loading };
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
