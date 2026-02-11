import { useExec } from "@raycast/utils";
import { SessionUsageCommandResponseSchema } from "../types/usage-types";
import { getExecOptions } from "../utils/exec-options";
import { stringToJSON } from "../utils/string-to-json-schema";
import { preferences } from "../preferences";

/**
 * Hook for executing `ccusage session --json` command
 */
export const useCCUsageSessionCli = () => {
  const useDirectCommand = preferences.useDirectCcusageCommand;

  const command = useDirectCommand ? "ccusage" : "npx";
  const args = useDirectCommand ? ["session", "--json"] : ["ccusage@latest", "session", "--json"];

  const result = useExec(command, args, {
    ...getExecOptions(),
    parseOutput: ({ stdout }) => {
      if (!stdout) {
        return { sessions: [] };
      }

      const parseResult = stringToJSON.pipe(SessionUsageCommandResponseSchema).safeParse(stdout.toString());

      if (!parseResult.success) {
        throw new Error(`Invalid session usage data: ${parseResult.error.message}`);
      }

      return parseResult.data;
    },
    keepPreviousData: true,
    failureToastOptions: {
      title: "Failed to fetch session usage data",
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
