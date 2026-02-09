import { getSearchVideos } from "../apis";

import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";

export function useSearchVideos(idx: number, keyword: string) {
  const [videoResults, setVideoResults] = useState<Array<Bilibili.SearchVideoResult>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!keyword) {
        setVideoResults([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const res = await getSearchVideos(idx, keyword);
        const data = res.filter((item) => item.arcurl);
        setVideoResults((prev) => {
          const merged = idx === 1 ? data : [...prev, ...data];
          const dedupedMap = new Map<string, Bilibili.SearchVideoResult>();
          for (const item of merged) {
            dedupedMap.set(item.bvid, item);
          }
          return [...dedupedMap.values()];
        });
        setIsLoading(false);
      } catch (error) {
        console.log(error);
        showToast(Toast.Style.Failure, "Get rcmd videos failed");
        setIsLoading(false);
      }
    })();
  }, [idx, keyword]);

  return { videoResults, isLoading };
}
