import { BlocksUsageResponseSchema, SessionBlockData } from "../types/usage-types";
import { execAsync } from "../utils/exec-async";
import { getExecOptions } from "../utils/exec-options";
import { getCustomNpxPath } from "../preferences";
import { handleToolError } from "../utils/tool-error-handler";

type Input = {
  /** Custom path to the npx executable */
  customNpxPath?: string;
  /** Whether to use the direct 'ccusage' command instead of 'npx ccusage' */
  useDirectCcusageCommand?: boolean;
  /** Show blocks from last N days */
  recent?: boolean;
};

/**
 * Get session blocks usage statistics
 * @param input - Configuration options
 * @returns Session blocks usage statistics
 * @throws Error when the CLI command fails or returns invalid data
 */
export default async function getBlocksUsage(input?: Input): Promise<SessionBlockData[]> {
  try {
    const npxCommand = getCustomNpxPath() ?? "npx";
    const command = input?.useDirectCcusageCommand ? "ccusage" : `${npxCommand} ccusage@latest`;
    const args = ["blocks", "--json"];

    if (input?.recent) {
      args.push("--recent");
    }

    const { stdout } = await execAsync(`${command} ${args.join(" ")}`, getExecOptions());
    const jsonData = JSON.parse(stdout);

    const parseResult = BlocksUsageResponseSchema.safeParse(jsonData);

    if (!parseResult.success) {
      throw new Error(`Invalid blocks usage data structure: ${parseResult.error.message}`);
    }

    return parseResult.data.blocks;
  } catch (error) {
    return handleToolError(error, "get-blocks-usage");
  }
}
