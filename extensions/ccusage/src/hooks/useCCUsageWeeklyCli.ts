import { useExec } from "@raycast/utils";
import { WeeklyUsageResponseSchema, WeeklyUsageDataSchema } from "../types/usage-types";
import { getExecOptions } from "../utils/exec-options";
import { stringToJSON } from "../utils/string-to-json-schema";
import { preferences } from "../preferences";
import { z } from "zod";

const FlexibleWeeklyUsageSchema = z.union([
  WeeklyUsageResponseSchema.transform((data) => data.weekly),
  WeeklyUsageDataSchema.transform((data) => [data]),
]);

/**
 * Hook for executing `ccusage weekly --json` command
 */
export const useCCUsageWeeklyCli = () => {
  const useDirectCommand = preferences.useDirectCcusageCommand;

  const command = useDirectCommand ? "ccusage" : "npx";
  const args = useDirectCommand ? ["weekly", "--json"] : ["ccusage@latest", "weekly", "--json"];
  const result = useExec(command, args, {
    ...getExecOptions(),
    parseOutput: ({ stdout }) => {
      if (!stdout) {
        throw new Error("No output received from ccusage weekly command");
      }

      const parseResult = stringToJSON.pipe(FlexibleWeeklyUsageSchema).safeParse(stdout.toString());

      if (!parseResult.success) {
        throw new Error(`Invalid weekly usage data: ${parseResult.error.message}`);
      }

      return parseResult.data;
    },
    keepPreviousData: true,
    failureToastOptions: {
      title: "Failed to fetch weekly usage data",
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
