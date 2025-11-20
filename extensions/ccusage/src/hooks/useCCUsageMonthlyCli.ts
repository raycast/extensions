import { useExec } from "@raycast/utils";
import { MonthlyUsageCommandResponseSchema } from "../types/usage-types";
import { getExecOptions } from "../utils/exec-options";
import { stringToJSON } from "../utils/string-to-json-schema";
import { preferences } from "../preferences";

/**
 * Hook for executing `ccusage monthly --json` command
 */
export const useCCUsageMonthlyCli = () => {
  const useDirectCommand = preferences.useDirectCcusageCommand;

  const command = useDirectCommand ? "ccusage" : "npx";
  const args = useDirectCommand ? ["monthly", "--json"] : ["ccusage@latest", "monthly", "--json"];

  const result = useExec(command, args, {
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
