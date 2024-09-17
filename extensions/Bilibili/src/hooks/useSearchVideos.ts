import { getSearchVideos } from "../apis";

import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";

export function useSearchVideos(idx: number, keyword: string) {
  const [videoResults, setVideoResults] = useState<Array<Bilibili.SearchVideoResult>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!keyword) return;

      try {
        const res = await getSearchVideos(idx, keyword);

        const data = res.filter((item) => item.arcurl)
        if (idx === 1) {
          setVideoResults(data)
        } else {
          setVideoResults([...videoResults, ...data]);
        }
        setIsLoading(false);
      } catch (error) {
        console.log(error);
        showToast(Toast.Style.Failure, "Get rcmd videos failed");
      }
    })();
  }, [idx, keyword]);

  return { videoResults, isLoading };
}
