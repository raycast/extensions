import { useExec } from "@raycast/utils";
import { MonthlyUsageCommandResponseSchema } from "../types/usage-types";
import { preferences } from "../preferences";
import { getExecOptions } from "../utils/exec-options";
import { stringToJSON } from "../utils/string-to-json-schema";

/**
 * Hook for executing `ccusage monthly --json` command
 */
export const useCCUsageMonthlyCli = () => {
  const npxCommand = preferences.customNpxPath || "npx";

  const result = useExec(npxCommand, ["ccusage@latest", "monthly", "--json"], {
    ...getExecOptions(),
    parseOutput: ({ stdout }) => {
      if (!stdout) {
        throw new Error("No output received from ccusage monthly command");
      }

      const parseResult = stringToJSON.pipe(MonthlyUsageCommandResponseSchema).safeParse(stdout.toString());

      if (!parseResult.success) {
        throw new Error(`Invalid monthly usage data: ${parseResult.error.message}`);
      }

      return parseResult.data;
    },
    keepPreviousData: true,
    failureToastOptions: {
      title: "Failed to fetch monthly usage data",
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
