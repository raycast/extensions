import { useState } from "react";
import { Cache } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { MonthlyUsageCommandResponse, MonthlyUsageCommandResponseSchema } from "../types/usage-types";
import { getExecOptions } from "../utils/exec-options";
import { stringToJSON } from "../utils/string-to-json-schema";
import { preferences } from "../preferences";

const cache = new Cache();
const CACHE_KEY = "ccusage-monthly";

export const useCCUsageMonthlyCli = () => {
  const useDirectCommand = preferences.useDirectCcusageCommand;

  const [initialData] = useState<MonthlyUsageCommandResponse | undefined>(() => {
    const cached = cache.get(CACHE_KEY);
    return cached ? (JSON.parse(cached) as MonthlyUsageCommandResponse) : undefined;
  });

  const command = useDirectCommand ? "ccusage" : "npx";
  const args = useDirectCommand ? ["monthly", "--json"] : ["ccusage@latest", "monthly", "--json"];

  const result = useExec(command, args, {
    ...getExecOptions(),
    initialData,
    parseOutput: ({ stdout }) => {
      if (!stdout) {
        throw new Error("No output received from ccusage monthly command");
      }

      const parseResult = stringToJSON.pipe(MonthlyUsageCommandResponseSchema).safeParse(stdout.toString());

      if (!parseResult.success) {
        throw new Error(`Invalid monthly usage data: ${parseResult.error.message}`);
      }

      cache.set(CACHE_KEY, JSON.stringify(parseResult.data));
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
