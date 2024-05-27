import { useCallback, useEffect, useState } from "react";
import { fetchItemInput, ItemInput } from "../utils/input-utils";
import { Application, getApplications, getDefaultApplication, showToast, Toast } from "@raycast/api";
import { TEST_URL } from "../utils/constants";
import { ItemType } from "../types/types";

export const useItemInput = (refresh: number) => {
  const [itemInput, setItemInput] = useState<ItemInput>(new ItemInput());

  const fetchData = useCallback(async () => {
    const inputItem = await fetchItemInput();
    if (inputItem.type == ItemType.NULL) {
      await showToast(Toast.Style.Failure, "Nothing has been detected from Selected or Clipboard!");
    } else {
      setItemInput(inputItem);
    }
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { itemInput: itemInput };
};

export const useBrowsers = (itemInput: ItemInput, refresh: number) => {
  const [browsers, setBrowsers] = useState<Application[]>([]);
  const [defaultBrowser, setDefaultBrowser] = useState<Application>();
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const browsers = await getApplications(TEST_URL);
    const defaultBrowser = await getDefaultApplication(TEST_URL);
    setBrowsers(browsers);
    setDefaultBrowser(defaultBrowser);
    setLoading(false);
  }, [itemInput, refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { browsers, defaultBrowser, loading };
};
