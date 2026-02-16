import { WeeklyUsageDataSchema, WeeklyUsageResponseSchema, WeeklyUsageData } from "../types/usage-types";
import { execAsync } from "../utils/exec-async";
import { getExecOptions } from "../utils/exec-options";
import { getCustomNpxPath } from "../preferences";
import { handleToolError } from "../utils/tool-error-handler";

type Input = {
  /** Custom path to the npx executable */
  customNpxPath?: string;
  /** Whether to use the direct 'ccusage' command instead of 'npx ccusage' */
  useDirectCcusageCommand?: boolean;
};

/**
 * Get weekly Claude Code usage statistics
 * @param input - Configuration options
 * @returns Weekly usage statistics
 * @throws Error when the CLI command fails or returns invalid data
 */
export default async function getWeeklyUsage(input?: Input): Promise<WeeklyUsageData[]> {
  try {
    const npxCommand = getCustomNpxPath() ?? "npx";
    const command = input?.useDirectCcusageCommand ? "ccusage" : `${npxCommand} ccusage@latest`;

    const { stdout } = await execAsync(`${command} weekly --json`, getExecOptions());
    const jsonData = JSON.parse(stdout);

    const parseResult = WeeklyUsageResponseSchema.safeParse(jsonData);

    if (!parseResult.success) {
      // Try to parse as single object if array fails
      const singleResult = WeeklyUsageDataSchema.safeParse(jsonData);
      if (singleResult.success) {
        return [singleResult.data];
      }
      throw new Error(`Invalid weekly usage data structure: ${parseResult.error.message}`);
    }

    return parseResult.data.weekly;
  } catch (error) {
    return handleToolError(error, "get-weekly-usage");
  }
}
