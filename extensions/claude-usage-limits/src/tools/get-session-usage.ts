import { SessionUsageCommandResponseSchema } from "../types/usage-types";
import { ccusageCommand } from "../utils/ccusage-command";
import { execAsync } from "../utils/exec-async";
import { getExecOptions } from "../utils/exec-options";
import { stringToJSON } from "../utils/string-to-json-schema";
import { describeParseFailure } from "../utils/parse-diagnostics";
import { captureCcusageVersion } from "../utils/ccusage-version";
import { validateDateFormat } from "../utils/date-validator";

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
 * Get detailed session-by-session Claude Code usage statistics
 * @param input - Optional input parameters for filtering and formatting
 * @returns Session usage data with individual session details
 * @throws Error when ccusage CLI is not available or returns invalid data
 */
export default async function getSessionUsage(input?: Input): Promise<{
  sessions: Array<{
    sessionId: string;
    totalCost: number;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
    modelName: string;
    date?: string;
  }>;
  sessionCount: number;
}> {
  const execOptions = getExecOptions();

  // Build arguments with optional parameters
  const args = ["session", "--json"];

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

  const [command, commandArgs] = ccusageCommand(args);
  const { stdout } = await execAsync(command, commandArgs, execOptions);

  if (!stdout) {
    throw new Error("No output received from ccusage session command");
  }

  const parseResult = stringToJSON.pipe(SessionUsageCommandResponseSchema).safeParse(stdout.toString());

  if (!parseResult.success) {
    const version = await captureCcusageVersion();
    throw new Error(describeParseFailure("Invalid session usage data", stdout.toString(), parseResult.error, version));
  }

  return {
    sessions: parseResult.data.sessions.map((session) => ({
      sessionId: session.sessionId,
      totalCost: session.totalCost,
      totalTokens: session.totalTokens,
      inputTokens: session.inputTokens,
      outputTokens: session.outputTokens,
      cacheCreationTokens: session.cacheCreationTokens,
      cacheReadTokens: session.cacheReadTokens,
      modelName: session.modelsUsed[0] || "unknown",
      date: session.lastActivity,
    })),
    sessionCount: parseResult.data.sessions.length,
  };
}
