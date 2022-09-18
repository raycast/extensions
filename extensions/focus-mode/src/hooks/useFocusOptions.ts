import { showToast, Toast } from "@raycast/api";

import { runAppleScript } from "run-applescript";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getActiveSelectedFocus, FocusOption } from "../utils";
import { useCacheHelpers } from "./useCacheHelpers";
import { getFocusOptions } from "../helpers";

export function useFocusOptions() {
  const { handleUpdateActiveFocus, retriveData, storeData } = useCacheHelpers();

  const options = useMemo<FocusOption[]>(() => retriveData(), [retriveData]);

  const [searchText, setSearchText] = useState("");
  const [filteredList, setFilterList] = useState<FocusOption[]>(options);

  const getData = useCallback(async () => {
    try {
      await showToast({
        title: "Updating focus options...",
        style: Toast.Style.Animated,
      });

      const focusOptions = await getFocusOptions();
      storeData(focusOptions);
      setFilterList(focusOptions);

      await showToast({
        title: "Success!",
        style: Toast.Style.Success,
      });
    } catch (err) {
      await showToast({
        title: "Failed to get focus options",
        style: Toast.Style.Failure,
      });
    }
  }, [storeData]);

  const onAction = useCallback(
    async (name: string) => {
      try {
        await showToast({
          title: "Changing focus...",
          style: Toast.Style.Animated,
        });

        const status = await runAppleScript(getActiveSelectedFocus(name));
        const isActive = status === "active";
        setFilterList(handleUpdateActiveFocus(name, isActive));

        await showToast({
          title: `Focus mode ${isActive ? "changed" : "deactivated"}!`,
          style: Toast.Style.Success,
        });
      } catch (err) {
        await showToast({
          title: "Failed to change focus mode",
          style: Toast.Style.Failure,
        });
      }
    },
    [handleUpdateActiveFocus]
  );

  useEffect(() => {
    setFilterList(
      searchText.trim() ? options.filter(({ name }) => name.toLowerCase().includes(searchText.toLowerCase())) : options
    );
  }, [options, searchText]);

  useEffect(() => {
    getData();
  }, [getData]);

  return {
    filteredList,
    onAction,
    setSearchText,
  };
}
