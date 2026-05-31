import { DailyUsageCommandResponseSchema } from "../types/usage-types";
import { runCcusage } from "../utils/run-ccusage";
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
  // Build command args with optional parameters
  const args = ["daily", "--json"];

  if (input?.since) {
    validateDateFormat(input.since, "Since");
    args.push("--since", input.since);
  }

  if (input?.until) {
    validateDateFormat(input.until, "Until");
    args.push("--until", input.until);
  }

  if (input?.order) {
    args.push("--order", input.order);
  }

  if (input?.breakdown) {
    args.push("--breakdown");
  }

  const stdout = await runCcusage(args);

  if (!stdout) {
    throw new Error("No output received from ccusage daily command");
  }

  const parseResult = stringToJSON.pipe(DailyUsageCommandResponseSchema).safeParse(stdout);

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
