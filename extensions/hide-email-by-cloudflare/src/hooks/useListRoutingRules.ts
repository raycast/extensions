import { listRoutingRules } from "../utils";

import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";

export function useListRoutingRules(idx: number) {
  const [routingRules, setRoutingRules] = useState<HideEmailCloudflare.Result[]>([]);
  const [isLoadingListRoutingRules, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await listRoutingRules(idx);

        setRoutingRules(res.result.filter((rule) => rule.matchers[0].type !== "all"));
        setIsLoading(false);
      } catch (error) {
        showToast(Toast.Style.Failure, "Get list of routing rules fail");
      }
    })();
  }, [idx]);

  return { routingRules, isLoadingListRoutingRules };
}
