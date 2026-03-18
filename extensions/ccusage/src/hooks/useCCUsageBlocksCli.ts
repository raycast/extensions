import { useExec } from "@raycast/utils";
import { BlocksUsageResponseSchema } from "../types/usage-types";
import { getExecOptions } from "../utils/exec-options";
import { stringToJSON } from "../utils/string-to-json-schema";
import { preferences } from "../preferences";

type Input = {
  /**
   * When true, requests only recent session blocks from the `ccusage` CLI.
   * This is a boolean toggle that maps to the CLI's `--recent` flag (does not accept a numeric value).
   */
  recent?: boolean;
};

/**
 * Hook for executing `ccusage blocks --json` command.
 *
 * The optional `input.recent` boolean maps to the CLI `--recent` flag and limits
 * the response to recent session blocks.
 */
export const useCCUsageBlocksCli = (input?: Input) => {
  const useDirectCommand = preferences.useDirectCcusageCommand;

  const command = useDirectCommand ? "ccusage" : "npx";
  const args = useDirectCommand ? ["blocks", "--json"] : ["ccusage@latest", "blocks", "--json"];

  if (input?.recent) {
    args.push("--recent");
  }

  const result = useExec(command, args, {
    ...getExecOptions(),
    parseOutput: ({ stdout }) => {
      if (!stdout) {
        throw new Error("No output received from ccusage blocks command");
      }

      const parseResult = stringToJSON.pipe(BlocksUsageResponseSchema).safeParse(stdout.toString());

      if (!parseResult.success) {
        throw new Error(`Invalid blocks usage data structure: ${parseResult.error.message}`);
      }

      return parseResult.data.blocks;
    },
    keepPreviousData: true,
    failureToastOptions: {
      title: "Failed to fetch session blocks",
      primaryAction: {
        title: "Retry",
        onAction: (toast) => {
          toast.hide();
          result.revalidate();
        },
      },
    },
  });

  return result;
};
