import { useCallback, useEffect, useState } from "react";
import { LocalStorage } from "@raycast/api";
import { fontFamily, LocalStorageKey } from "../utils/constants";

export const getStarTextFont = (refresh: number) => {
  const [starTextFont, setStarTextFont] = useState<string>("");

  const fetchData = useCallback(async () => {
    try {
      const localStorage = await LocalStorage.getItem<string>(LocalStorageKey.STAR_TEXT_FONT);
      const _starTextFont = typeof localStorage === "undefined" ? fontFamily[0].value : localStorage;
      setStarTextFont(_starTextFont);
    } catch (e) {
      console.error(e);
    }
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { starTextFont: starTextFont };
};
