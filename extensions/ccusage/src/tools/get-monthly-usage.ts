import { MonthlyUsageCommandResponseSchema } from "../types/usage-types";
import { preferences } from "../preferences";
import { execAsync } from "../utils/exec-async";
import { getExecOptions } from "../utils/exec-options";
import { stringToJSON } from "../utils/string-to-json-schema";
import { validateDateFormat } from "../utils/date-validator";
import { getCurrentLocalMonth } from "../utils/date-formatter";

type Input = {
  /** Start date in YYYYMMDD format */
  since?: string;
  /** End date in YYYYMMDD format */
  until?: string;
  /** Sort order */
  order?: "desc" | "asc";
  /** Show per-model cost breakdown */
  breakdown?: boolean;
  /** Use offline mode */
  offline?: boolean;
};

/**
 * Get current month's Claude Code usage statistics and model breakdowns
 * @param input - Optional input parameters for filtering and formatting
 * @returns Monthly usage data with model-wise breakdown
 * @throws Error when ccusage CLI is not available or returns invalid data
 */
export default async function getMonthlyUsage(input?: Input): Promise<{
  month: string;
  totalCost: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  modelBreakdowns: Array<{
    modelName: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    totalCost: number;
  }>;
}> {
  const npxCommand = preferences.customNpxPath || "npx";
  const execOptions = getExecOptions();

  // Build command with optional parameters
  let command = `${npxCommand} ccusage@latest monthly --json`;

  if (input?.since) {
    validateDateFormat(input.since, "Since");
    command += ` --since ${input.since}`;
  }

  if (input?.until) {
    validateDateFormat(input.until, "Until");
    command += ` --until ${input.until}`;
  }

  if (input?.order) {
    command += ` --order ${input.order}`;
  }

  if (input?.breakdown) {
    command += ` --breakdown`;
  }

  if (input?.offline) {
    command += ` --offline`;
  }

  const { stdout } = await execAsync(command, execOptions);

  if (!stdout) {
    throw new Error("No output received from ccusage monthly command");
  }

  const parseResult = stringToJSON.pipe(MonthlyUsageCommandResponseSchema).safeParse(stdout.toString());

  if (!parseResult.success) {
    throw new Error(`Invalid monthly usage data: ${parseResult.error.message}`);
  }

  const currentMonth = getCurrentLocalMonth();
  const monthlyEntry = parseResult.data.monthly.find((entry) => entry.month === currentMonth);

  if (!monthlyEntry) {
    const latest = parseResult.data.monthly[parseResult.data.monthly.length - 1];
    return {
      month: latest?.month || currentMonth,
      totalCost: latest?.totalCost || 0,
      totalTokens: latest?.totalTokens || 0,
      inputTokens: latest?.inputTokens || 0,
      outputTokens: latest?.outputTokens || 0,
      cacheCreationTokens: latest?.cacheCreationTokens || 0,
      cacheReadTokens: latest?.cacheReadTokens || 0,
      modelBreakdowns:
        latest?.modelBreakdowns?.map((breakdown) => ({
          modelName: breakdown.modelName,
          inputTokens: breakdown.inputTokens,
          outputTokens: breakdown.outputTokens,
          totalTokens: breakdown.inputTokens + breakdown.outputTokens,
          totalCost: breakdown.cost,
        })) || [],
    };
  }

  return {
    month: monthlyEntry.month,
    totalCost: monthlyEntry.totalCost,
    totalTokens: monthlyEntry.totalTokens,
    inputTokens: monthlyEntry.inputTokens,
    outputTokens: monthlyEntry.outputTokens,
    cacheCreationTokens: monthlyEntry.cacheCreationTokens,
    cacheReadTokens: monthlyEntry.cacheReadTokens,
    modelBreakdowns:
      monthlyEntry.modelBreakdowns?.map((breakdown) => ({
        modelName: breakdown.modelName,
        inputTokens: breakdown.inputTokens,
        outputTokens: breakdown.outputTokens,
        totalTokens: breakdown.inputTokens + breakdown.outputTokens,
        totalCost: breakdown.cost,
      })) || [],
  };
}
