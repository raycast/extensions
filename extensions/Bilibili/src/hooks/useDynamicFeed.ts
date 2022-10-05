import { getDynamicFeed } from "../utils";

import { useEffect, useState } from "react";
import { showToast, Toast } from "@raycast/api";

export function useDynamicFeed() {
  const [dynamicItems, setDynamicItems] = useState<Bilibili.dynamicItems>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getDynamicFeed();

        setDynamicItems(res);
        setIsLoading(false);
      } catch (error) {
        showToast(Toast.Style.Failure, "Get dynamic video feed failed");
      }
    })();
  }, []);

  return { dynamicItems, isLoading };
}
