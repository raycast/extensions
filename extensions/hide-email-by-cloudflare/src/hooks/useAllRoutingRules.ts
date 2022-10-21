import { listRoutingRules } from "../utils";

import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";

export function useAllRoutingRules() {
  const [allRoutingRules, setAllRoutingRules] = useState<Array<string>>([]);
  const [isLoadingAllRoutingRules, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        let idx = 1,
          res,
          total;
        const allRules: Array<string> = [];

        do {
          res = await listRoutingRules(idx);
          setAllRoutingRules(
            allRules.concat(
              res.result
                .filter((rule) => rule.matchers[0].type !== "all")
                .map((res) => res.matchers[0].value.split("@")[0])
            )
          );
          total = res.result_info.total_count;
          idx++;
        } while (allRules.length === total);
        setIsLoading(false);
      } catch (error) {
        showToast(Toast.Style.Failure, "Get list of routing rules fail");
      }
    })();
  }, []);

  return { allRoutingRules, isLoadingAllRoutingRules };
}
