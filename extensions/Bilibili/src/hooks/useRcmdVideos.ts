import { getRcmd } from "../apis";

import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";

export function useRcmdVideos(idx: number) {
  const [rcmdVideos, setRcmdVideos] = useState<Bilibili.Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const res = await getRcmd(idx);
        const data = res.filter((item) => item.uri);

        setRcmdVideos((prev) => {
          const merged = [...prev, ...data];
          const dedupedMap = new Map<string, Bilibili.Video>();
          for (const item of merged) {
            dedupedMap.set(item.bvid, item);
          }
          return [...dedupedMap.values()];
        });
        setIsLoading(false);
      } catch (error) {
        showToast(Toast.Style.Failure, "Get rcmd videos failed");
        setIsLoading(false);
      }
    })();
  }, [idx]);

  return { rcmdVideos, isLoading };
}
