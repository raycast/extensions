import { useExec } from "@raycast/utils";
import { TotalUsageResponseSchema } from "../types/usage-types";
import { getExecOptions } from "../utils/exec-options";
import { stringToJSON } from "../utils/string-to-json-schema";
import { preferences } from "../preferences";

/**
 * Hook for executing `ccusage --json` command
 */
export const useCCUsageTotalCli = () => {
  const useDirectCommand = preferences.useDirectCcusageCommand;

  const command = useDirectCommand ? "ccusage" : "npx";
  const args = useDirectCommand ? ["--json"] : ["ccusage@latest", "--json"];

  const result = useExec(command, args, {
    ...getExecOptions(),
    parseOutput: ({ stdout }) => {
      if (!stdout) {
        throw new Error("No output received from ccusage command");
      }

      const parseResult = stringToJSON.pipe(TotalUsageResponseSchema).safeParse(stdout.toString());

      if (!parseResult.success) {
        throw new Error(`Invalid total usage data: ${parseResult.error.message}`);
      }

      return parseResult.data;
    },
    keepPreviousData: true,
    failureToastOptions: {
      title: "Failed to fetch total usage data",
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
