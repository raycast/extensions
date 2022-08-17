import { showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";

import { getSummary } from "../utils";

export function useTodaySummary() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [data, setData] = useState<WakaTime.Summary>();

  useEffect(() => {
    async function getData() {
      setIsLoading(true);

      try {
        const data = await getSummary("Today", new Date());

        if (!data.ok) throw new Error(data.error);

        setData(data);
      } catch (error) {
        await showToast(
          Toast.Style.Failure,
          "Error Loading Today's Summary",
          (error as Record<string, string>).message
        );
      }

      setIsLoading(false);
    }

    getData();
  }, []);

  return { data, isLoading };
}
