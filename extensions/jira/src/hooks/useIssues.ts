import { useCachedPromise } from "@raycast/utils";

import { getIssues } from "../api/issues";

export function useEpicIssues(epicKey: string, options?: Record<string, unknown>) {
  const jql = epicKey ? `parent = ${epicKey}` : "issue = null";
  const { data: issues, isLoading, mutate } = useCachedPromise((jql) => getIssues({ jql }), [jql], options);
  return { issues, isLoading, mutate };
}
export default function useIssues(jql: string, options?: Record<string, unknown>) {
  const { data: issues, isLoading, mutate } = useCachedPromise((jql) => getIssues({ jql }), [jql], options);
  return { issues, isLoading, mutate };
}
