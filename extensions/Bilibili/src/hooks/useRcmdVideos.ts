import { showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { getRcmd } from "../utils";

export function useRcmdVideos(idx: number) {
  const [rcmdVideos, setRcmdVideos] = useState<Bilibili.video[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getRcmd(idx);

        setRcmdVideos(rcmdVideos.concat(res));
        setIsLoading(false);
      } catch (error) {
        showToast(Toast.Style.Failure, "Get rcmd videos failed");
      }
    })();
  }, [idx]);

  return { rcmdVideos, isLoading };
}
