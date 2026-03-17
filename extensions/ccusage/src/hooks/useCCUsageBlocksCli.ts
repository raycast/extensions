import { useState } from "react";
import { Cache } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { BlocksCommandResponse, BlocksCommandResponseSchema } from "../types/usage-types";
import { getExecOptions } from "../utils/exec-options";
import { stringToJSON } from "../utils/string-to-json-schema";
import { preferences } from "../preferences";

const cache = new Cache();
const CACHE_KEY = "ccusage-blocks";

export const useCCUsageBlocksCli = () => {
  const useDirectCommand = preferences.useDirectCcusageCommand;

  const [initialData] = useState<BlocksCommandResponse | undefined>(() => {
    const cached = cache.get(CACHE_KEY);
    return cached ? (JSON.parse(cached) as BlocksCommandResponse) : undefined;
  });

  const command = useDirectCommand ? "ccusage" : "npx";
  const args = useDirectCommand ? ["blocks", "--json"] : ["ccusage@latest", "blocks", "--json"];

  const result = useExec(command, args, {
    ...getExecOptions(),
    initialData,
    parseOutput: ({ stdout }) => {
      if (!stdout) {
        return { blocks: [] };
      }

      const parseResult = stringToJSON.pipe(BlocksCommandResponseSchema).safeParse(stdout.toString());

      if (!parseResult.success) {
        throw new Error(`Invalid blocks data: ${parseResult.error.message}`);
      }

      cache.set(CACHE_KEY, JSON.stringify(parseResult.data));
      return parseResult.data;
    },
    keepPreviousData: true,
    failureToastOptions: {
      title: "Failed to fetch blocks data",
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
