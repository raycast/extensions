import { TotalUsageResponseSchema } from "../types/usage-types";
import { preferences } from "../preferences";
import { execAsync } from "../utils/exec-async";
import { getExecOptions } from "../utils/exec-options";
import { stringToJSON } from "../utils/string-to-json-schema";

/**
 * Get comprehensive Claude Code usage statistics including totals, sessions, and model breakdowns
 * @returns Complete usage statistics with model-wise breakdown
 * @throws Error when ccusage CLI is not available or returns invalid data
 */
export default async function getTotalUsage(): Promise<{
  totalCost: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  sessions: number;
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

  const { stdout } = await execAsync(`${npxCommand} ccusage@latest --json`, execOptions);

  if (!stdout) {
    throw new Error("No output received from ccusage command");
  }

  const parseResult = stringToJSON.pipe(TotalUsageResponseSchema).safeParse(stdout.toString());

  if (!parseResult.success) {
    throw new Error(`Invalid total usage data: ${parseResult.error.message}`);
  }

  const data = parseResult.data;

  const modelBreakdowns = new Map<
    string,
    {
      modelName: string;
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      totalCost: number;
    }
  >();

  data.daily.forEach((day) => {
    day.modelBreakdowns.forEach((breakdown) => {
      const existing = modelBreakdowns.get(breakdown.modelName);
      if (existing) {
        existing.inputTokens += breakdown.inputTokens;
        existing.outputTokens += breakdown.outputTokens;
        existing.totalTokens = existing.inputTokens + existing.outputTokens;
        existing.totalCost += breakdown.cost;
      } else {
        modelBreakdowns.set(breakdown.modelName, {
          modelName: breakdown.modelName,
          inputTokens: breakdown.inputTokens,
          outputTokens: breakdown.outputTokens,
          totalTokens: breakdown.inputTokens + breakdown.outputTokens,
          totalCost: breakdown.cost,
        });
      }
    });
  });

  return {
    totalCost: data.totals.totalCost,
    totalTokens: data.totals.totalTokens,
    inputTokens: data.totals.inputTokens,
    outputTokens: data.totals.outputTokens,
    cacheCreationTokens: data.totals.cacheCreationTokens,
    cacheReadTokens: data.totals.cacheReadTokens,
    sessions: data.daily.length,
    modelBreakdowns: Array.from(modelBreakdowns.values()),
  };
}
