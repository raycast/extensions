import { DailyUsageCommandResponseSchema } from "../types/usage-types";
import { preferences } from "../preferences";
import { execAsync } from "../utils/exec-async";
import { getExecOptions } from "../utils/exec-options";
import { stringToJSON } from "../utils/string-to-json-schema";
import { validateDateFormat } from "../utils/date-validator";
import { getCurrentLocalDate } from "../utils/date-formatter";

type Input = {
  /** Start date in YYYYMMDD format */
  since?: string;
  /** End date in YYYYMMDD format */
  until?: string;
  /** Sort order */
  order?: "desc" | "asc";
  /** Show per-model cost breakdown */
  breakdown?: boolean;
};

/**
 * Get today's Claude Code usage including cost, tokens, and statistics
 * @param input - Optional input parameters for filtering and formatting
 * @returns Daily usage data with cost and token information
 * @throws Error when ccusage CLI is not available or returns invalid data
 */
export default async function getDailyUsage(input?: Input): Promise<{
  cost: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  date: string;
}> {
  const npxCommand = preferences.customNpxPath || "npx";
  const execOptions = getExecOptions();

  // Build command with optional parameters
  let command = `${npxCommand} ccusage@latest daily --json`;

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

  const { stdout } = await execAsync(command, execOptions);

  if (!stdout) {
    throw new Error("No output received from ccusage daily command");
  }

  const parseResult = stringToJSON.pipe(DailyUsageCommandResponseSchema).safeParse(stdout.toString());

  if (!parseResult.success) {
    throw new Error(`Invalid daily usage data: ${parseResult.error.message}`);
  }

  const today = getCurrentLocalDate();
  const todayEntry = parseResult.data.daily.find((entry) => entry.date === today);

  if (!todayEntry) {
    const latest = parseResult.data.daily[parseResult.data.daily.length - 1];
    return {
      cost: latest?.totalCost || 0,
      inputTokens: latest?.inputTokens || 0,
      outputTokens: latest?.outputTokens || 0,
      totalTokens: latest?.totalTokens || 0,
      date: latest?.date || today,
    };
  }

  return {
    cost: todayEntry.totalCost,
    inputTokens: todayEntry.inputTokens,
    outputTokens: todayEntry.outputTokens,
    totalTokens: todayEntry.totalTokens,
    date: todayEntry.date,
  };
}
