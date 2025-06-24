import { SessionUsageCommandResponseSchema } from "../types/usage-types";
import { preferences } from "../preferences";
import { execAsync } from "../utils/exec-async";
import { getExecOptions } from "../utils/exec-options";
import { stringToJSON } from "../utils/string-to-json-schema";
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
    date: string;
  }>;
  sessionCount: number;
}> {
  const npxCommand = preferences.customNpxPath || "npx";
  const execOptions = getExecOptions();

  // Build command with optional parameters
  let command = `${npxCommand} ccusage@latest session --json`;

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
    throw new Error("No output received from ccusage session command");
  }

  const parseResult = stringToJSON.pipe(SessionUsageCommandResponseSchema).safeParse(stdout.toString());

  if (!parseResult.success) {
    throw new Error(`Invalid session usage data: ${parseResult.error.message}`);
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
