import { getPopularVideos } from "../utils";

import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";

export function usePopularVideos(pn: number) {
  const [popularVideos, setPopularVideos] = useState<Bilibili.video[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getPopularVideos(pn);

        setPopularVideos(popularVideos.concat(res));
        setIsLoading(false);
      } catch (error) {
        showToast(Toast.Style.Failure, "Get popular videos failed");
      }
    })();
  }, [pn]);

  return { popularVideos, isLoading };
}
