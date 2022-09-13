import { getDynamicFeed } from "../utils/getDynamicFeed";

import { useEffect, useState } from "react";
import { showToast, Toast } from "@raycast/api";

export function useDynamicFeed() {
  const [dynamicVideoFeed, setDynamicVideoFeed] = useState<Bilibili.dynamicVideoFeedAll>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getDynamicFeed();

        setDynamicVideoFeed(res);
        setIsLoading(false);
      } catch (error) {
        console.log(error);
        showToast(Toast.Style.Failure, "Get dynamic video feed failed");
      }
    })();
  }, []);

  return { dynamicVideoFeed, isLoading };
}
