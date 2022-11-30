import { getPopularSeriesList } from "../utils";

import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";

export function usePopularSeriesList() {
  const [popularSeriesList, setPopularSeriesList] = useState<Bilibili.popularSeries[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getPopularSeriesList();

        setPopularSeriesList(res);
        setIsLoading(false);
      } catch (error) {
        showToast(Toast.Style.Failure, "Get popular series list failed");
      }
    })();
  }, []);

  return { popularSeriesList, isLoading };
}
