import { environment } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { customToolToDefinition, readCustomToolsFile } from "../custom-tools";
import { ToolDefinition } from "../tools";

export interface CustomToolsHook {
  data: ToolDefinition[];
  isLoading: boolean;
  reload: () => Promise<void>;
}

export function useCustomTools(): CustomToolsHook {
  const [data, setData] = useState<ToolDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    const stored = await readCustomToolsFile(environment.supportPath);
    const nextData = stored.tools.map(customToolToDefinition);
    setData((currentData) => {
      if (JSON.stringify(currentData) === JSON.stringify(nextData)) {
        return currentData;
      }
      return nextData;
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    reload();
    const refreshTimer = setInterval(reload, 1000);
    return () => clearInterval(refreshTimer);
  }, [reload]);

  return useMemo(() => ({ data, isLoading, reload }), [data, isLoading, reload]);
}
