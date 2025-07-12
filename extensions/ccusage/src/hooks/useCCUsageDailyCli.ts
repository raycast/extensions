import { useExec } from "@raycast/utils";
import { DailyUsageCommandResponseSchema } from "../types/usage-types";
import { getExecOptions } from "../utils/exec-options";
import { stringToJSON } from "../utils/string-to-json-schema";

/**
 * Hook for executing `ccusage daily --json` command
 */
export const useCCUsageDailyCli = () => {
  const result = useExec("npx", ["ccusage@latest", "daily", "--json"], {
    ...getExecOptions(),
    parseOutput: ({ stdout }) => {
      if (!stdout) {
        throw new Error("No output received from ccusage daily command");
      }

      const parseResult = stringToJSON.pipe(DailyUsageCommandResponseSchema).safeParse(stdout.toString());

      if (!parseResult.success) {
        throw new Error(`Invalid daily usage data: ${parseResult.error.message}`);
      }

      return parseResult.data;
    },
    keepPreviousData: true,
    failureToastOptions: {
      title: "Failed to fetch daily usage data",
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
