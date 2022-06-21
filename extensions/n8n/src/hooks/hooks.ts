//get if show detail
import { useCallback, useEffect, useState } from "react";
import { LocalStorage } from "@raycast/api";
import { LocalStorageKey } from "../utils/constants";
import { getAllWorkFlowsCLI } from "../utils/n8n-cli-utils";
import { Workflow } from "../types/types";

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

export const getAllWorkflows = (refresh: number) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const _allWorkflows = await getAllWorkFlowsCLI();
    setWorkflows(_allWorkflows);
    setLoading(false);
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { workflows: workflows, loading: loading };
};
