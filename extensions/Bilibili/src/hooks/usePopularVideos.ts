import { getPopularVideos } from "../utils";

import { showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";

export function usePopularVideos() {
  const [popularVideos, setPopularVideos] = useState<Bilibili.popularVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getPopularVideos();

        setPopularVideos(res);
        setIsLoading(false);
      } catch (error) {
        console.log(error);
        showToast(Toast.Style.Failure, "Get popular videos failed");
      }
    })();
  }, []);

  return { popularVideos, isLoading };
}
