import { runCodexDaily } from "../api/codexClient";
import { createDashboardDataError } from "../../common/lib/dashboardDataError";
import {
  parseDailyUsage,
  summarizeDailyUsage,
} from "../../common/lib/usageSummary/usageSummary";
import type { UsageDashboardData } from "../../common/lib/dashboardTypes";
import type { CcusageResult } from "../../common/lib/command";

type LoadCodexUsageDashboardDataOptions = {
  runDaily?: () => Promise<CcusageResult>;
};

export const loadCodexUsageDashboardData = async ({
  runDaily = runCodexDaily,
}: LoadCodexUsageDashboardDataOptions = {}): Promise<UsageDashboardData> => {
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
      "@ccusage/codex daily --json",
      "@ccusage/codex",
    );
  }
};
