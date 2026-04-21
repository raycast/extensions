import { useState } from "react";
import { Cache } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { SessionUsageCommandResponse, SessionUsageCommandResponseSchema } from "../types/usage-types";
import { getExecOptions } from "../utils/exec-options";
import { stringToJSON } from "../utils/string-to-json-schema";
import { preferences } from "../preferences";

const cache = new Cache();
const CACHE_KEY = "ccusage-session";

export const useCCUsageSessionCli = () => {
  const useDirectCommand = preferences.useDirectCcusageCommand;

  const [initialData] = useState<SessionUsageCommandResponse | undefined>(() => {
    const cached = cache.get(CACHE_KEY);
    return cached ? (JSON.parse(cached) as SessionUsageCommandResponse) : undefined;
  });

  const command = useDirectCommand ? "ccusage" : "npx";
  const args = useDirectCommand ? ["session", "--json"] : ["ccusage@latest", "session", "--json"];

  const result = useExec(command, args, {
    ...getExecOptions(),
    initialData,
    parseOutput: ({ stdout }) => {
      if (!stdout) {
        return { sessions: [] };
      }

      const parseResult = stringToJSON.pipe(SessionUsageCommandResponseSchema).safeParse(stdout.toString());

      if (!parseResult.success) {
        throw new Error(`Invalid session usage data: ${parseResult.error.message}`);
      }

      cache.set(CACHE_KEY, JSON.stringify(parseResult.data));
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
