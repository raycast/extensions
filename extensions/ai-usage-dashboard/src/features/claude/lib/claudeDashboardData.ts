import {
  runCcusageBlocks,
  runCcusageDaily,
  type CcusageResult,
} from "../api/ccusageClient";
import {
  parseBillingBlocks,
  summarizeCurrentBillingBlock,
} from "./billingBlockSummary/billingBlockSummary";
import { createDashboardDataError } from "../../common/lib/dashboardDataError";
import { buildRawJson } from "../../common/lib/dashboardState/dashboardState";
import {
  parseDailyUsage,
  summarizeDailyUsage,
} from "../../common/lib/usageSummary/usageSummary";
import type { UsageDashboardData } from "../../common/lib/dashboardTypes";
import type { BillingBlock } from "./billingBlockSummary/billingBlockSummary";

export type ClaudeUsageDashboardData = UsageDashboardData & {
  currentBlock?: BillingBlock;
};

type LoadAiUsageDashboardDataOptions = {
  runBlocks?: () => Promise<CcusageResult>;
  runDaily?: () => Promise<CcusageResult>;
};

export const loadAiUsageDashboardData = async ({
  runBlocks = runCcusageBlocks,
  runDaily = runCcusageDaily,
}: LoadAiUsageDashboardDataOptions = {}): Promise<ClaudeUsageDashboardData> => {
  const [dailyResult, blocksResult] = await Promise.all([
    runDaily(),
    runBlocks(),
  ]);
  const rawJson = buildRawJson(dailyResult.stdout, blocksResult.stdout);

  try {
    const rows = parseDailyUsage(dailyResult.stdout);
    const summary = summarizeDailyUsage(rows);
    const blocks = parseBillingBlocks(blocksResult.stdout);
    const currentBlock = summarizeCurrentBillingBlock(blocks);

    return {
      currentBlock,
      rawJson,
      summary,
    };
  } catch (error) {
    throw createDashboardDataError(error, rawJson);
  }
};
