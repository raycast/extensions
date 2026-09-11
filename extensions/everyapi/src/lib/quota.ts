import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";

import { getAdminApiBase } from "./client";

// Quota -> USD conversion rate. Defaults to the published peg (500_000 = $1,
// per backend/internal/common/constants.go) and is overwritten with the
// deployment's real quota_per_unit once /api/status answers, so the $ figures
// stay correct on self-hosted instances that retuned it.
let runtimeQuotaPerUnit = 500_000;

export function getQuotaPerUnit(): number {
  return runtimeQuotaPerUnit;
}

interface StatusResp {
  data?: { quota_per_unit?: number };
}

// Fetches the public /api/status and syncs the rate. Returns the current rate
// so the calling command re-renders when it resolves. The fetched value is
// written into the module rate from an effect (never during render) so the
// synchronous getQuotaPerUnit() formatters elsewhere also pick it up.
export function useSyncQuotaPerUnit(): number {
  const { data } = useFetch<StatusResp>(`${getAdminApiBase()}/status`, {
    keepPreviousData: true,
  });
  const fetched = data?.data?.quota_per_unit;
  const [rate, setRate] = useState(runtimeQuotaPerUnit);
  useEffect(() => {
    if (typeof fetched === "number" && fetched > 0) {
      runtimeQuotaPerUnit = fetched;
      setRate(fetched);
    }
  }, [fetched]);
  return rate;
}
