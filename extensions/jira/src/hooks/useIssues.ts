import { useCachedPromise } from "@raycast/utils";
import { useCallback } from "react";

import { getIssues } from "../api/issues";

export function useEpicIssues(epicKey: string, options?: Record<string, unknown>) {
  const jql = epicKey ? `parent = ${epicKey}` : "issue = null";
  const fetcher = useCallback((q: string) => getIssues({ jql: q }), []);
  const { data: issues, isLoading, mutate } = useCachedPromise(fetcher, [jql], options);
  return { issues, isLoading, mutate };
}
export default function useIssues(jql: string, options?: Record<string, unknown>) {
  const fetcher = useCallback((q: string) => getIssues({ jql: q }), []);
  const { data: issues, isLoading, mutate } = useCachedPromise(fetcher, [jql], options);
  return { issues, isLoading, mutate };
}
