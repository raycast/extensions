import { environment, getPreferenceValues } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { join } from "node:path";
import { useRef } from "react";
import { fetchUsage } from "../lib/codex";
import { UsageSnapshot } from "../lib/usage";

export function useUsage() {
  const preferences = getPreferenceValues<{ codexPath?: string }>();
  const path = preferences.codexPath ?? "";
  const helperPath = join(environment.assetsPath, "codex-usage-helper");
  const [data, setData] = useCachedState<UsageSnapshot | undefined>(JSON.stringify([path, helperPath]), undefined, {
    cacheNamespace: "plan-usage",
  });
  const abortable = useRef<AbortController | null>(null);
  const result = usePromise(
    (path: string, helperPath: string) => fetchUsage(path, helperPath, abortable.current?.signal),
    [path, helperPath],
    {
      abortable,
      onData: setData,
      // Both views show errors inline; background refreshes shouldn't raise repeated toasts.
      onError: () => undefined,
    },
  );
  const now = Date.now();
  const stale = Boolean(result.error) || Boolean(data && now - data.fetchedAt > 15 * 60000);
  return { ...result, data, now, stale };
}
