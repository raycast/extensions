import { useExec } from "@raycast/utils";
import { SessionUsageCommandResponseSchema } from "../types/usage-types";
import { preferences } from "../preferences";
import { getExecOptions } from "../utils/exec-options";
import { stringToJSON } from "../utils/string-to-json-schema";

/**
 * Hook for executing `ccusage session --json` command
 */
export const useCCUsageSessionCli = () => {
  const npxCommand = preferences.customNpxPath || "npx";

  const result = useExec(npxCommand, ["ccusage@latest", "session", "--json"], {
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
