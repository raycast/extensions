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
      if (tag?.startsWith("tag:")) {
        console.debug(tag?.substring(4));
        const tagBunches = (await scriptToGetTaggedBunches(tag?.substring(4))).split(", ");
        console.debug(tagBunches);
        const _bunches: BunchesInfo[] = [];
        tagBunches.map((value) => {
          if (isEmpty(value)) return;
          _bunches.push({ name: value, isOpen: openBunches.includes(value) });
        });
        setBunches(_bunches);
      } else if (isEmpty(tag)) {
        const allBunches = (await scriptToGetBunches()).split(", ");
        const _bunches = allBunches.map((value) => {
          return { name: value, isOpen: openBunches.includes(value) };
        });
        setBunches(_bunches);
      }
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

export const getBunchPreferences = () => {
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
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { bunchPreferences: bunchPreferences, loading: loading };
};
