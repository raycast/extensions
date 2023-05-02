import { getPopularSeriesVideos } from "../utils";

import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";

export function usePopularSeriesVideos(number: number) {
  const [popularSeriesVideos, setPopularSeriesVideos] = useState<Bilibili.video[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getPopularSeriesVideos(number);

        setPopularSeriesVideos(res);
        setIsLoading(false);
      } catch (error) {
        showToast(Toast.Style.Failure, "Get popular series videos failed");
      }
    })();
  }, []);

  return { popularSeriesVideos, isLoading };
}
