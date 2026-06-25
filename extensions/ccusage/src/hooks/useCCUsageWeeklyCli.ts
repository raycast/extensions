import { useState, useEffect } from "react";
import { Cache } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { WeeklyUsageCommandResponse, WeeklyUsageCommandResponseSchema } from "../types/usage-types";
import { getExecOptions } from "../utils/exec-options";
import { stringToJSON } from "../utils/string-to-json-schema";
import { describeParseFailure } from "../utils/parse-diagnostics";
import { getCcusageVersionSync } from "../utils/ccusage-version";
import { preferences } from "../preferences";

const cache = new Cache();
const CACHE_KEY = "ccusage-weekly";

export const useCCUsageWeeklyCli = () => {
  const useDirectCommand = preferences.useDirectCcusageCommand;

  const [initialData] = useState<WeeklyUsageCommandResponse | undefined>(() => {
    const cached = cache.get(CACHE_KEY);
    return cached ? (JSON.parse(cached) as WeeklyUsageCommandResponse) : undefined;
  });

  const command = useDirectCommand ? "ccusage" : "npx";
  const args = useDirectCommand ? ["weekly", "--json"] : ["ccusage@latest", "weekly", "--json"];

  const result = useExec(command, args, {
    ...getExecOptions(),
    initialData,
    parseOutput: ({ stdout }) => {
      if (!stdout) {
        throw new Error("No output received from ccusage weekly command");
      }

      const parseResult = stringToJSON.pipe(WeeklyUsageCommandResponseSchema).safeParse(stdout.toString());

      if (!parseResult.success) {
        throw new Error(
          describeParseFailure(
            "Invalid weekly usage data",
            stdout.toString(),
            parseResult.error,
            getCcusageVersionSync(),
          ),
        );
      }

      cache.set(CACHE_KEY, JSON.stringify(parseResult.data));
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

  const intervalMs = parseInt(preferences.usageLimitsRefreshInterval || "60", 10) * 1000;
  useEffect(() => {
    const id = setInterval(() => result.revalidate(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, result.revalidate]);

  return result;
};
