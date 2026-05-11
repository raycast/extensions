import { runAmpDaily } from "../api/ampClient";
import { createDashboardDataError } from "../../common/lib/dashboardDataError";
import {
  parseDailyUsage,
  summarizeDailyUsage,
} from "../../common/lib/usageSummary/usageSummary";
import type { CcusageResult } from "../../common/lib/command";
import type { UsageDashboardData } from "../../common/lib/dashboardTypes";

type LoadAmpUsageDashboardDataOptions = {
  runDaily?: () => Promise<CcusageResult>;
};

export const loadAmpUsageDashboardData = async ({
  runDaily = runAmpDaily,
}: LoadAmpUsageDashboardDataOptions = {}): Promise<UsageDashboardData> => {
  const dailyResult = await runDaily();
  const rawJson = JSON.stringify(
    {
      daily: JSON.parse(dailyResult.stdout),
    },
    null,
    2,
  );

  try {
    const rows = parseDailyUsage(dailyResult.stdout);
    const summary = summarizeDailyUsage(rows);

    return {
      rawJson,
      summary,
    };
  } catch (error) {
    throw createDashboardDataError(
      error,
      rawJson,
      "@ccusage/amp daily --json",
      "@ccusage/amp",
    );
  }
};
