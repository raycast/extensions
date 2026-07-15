import { showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";

import { DataType, fetchData, getApiHealth } from "../utils/data.util";

export function useFetchData<T>(dataKey: DataType) {
  const [data, setData] = useState<Record<string, T>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const isHealthy = await getApiHealth();
        if (!isHealthy) {
          throw new Error("API is currently unavailable");
        }

        const fetchedData = await fetchData<T>(dataKey);
        setData(fetchedData);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch data",
          message: (error as Error).message,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [dataKey]);

  return { data, isLoading, setData };
}
