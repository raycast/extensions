//get if show detail
import { useCallback, useEffect, useState } from "react";
import { LocalStorage } from "@raycast/api"; // Removed Alert, confirmAlert, open
import { SAVED_COMMANDS_KEY } from "../utils/constants";
// Removed getAllWorkFlowsCLI import
// Removed unused Workflow import

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

// Removed getAllWorkflows hook
// Removed appNotInstallAlertDialog function
