import { useCachedPromise } from "@raycast/utils";
import { fetchAssignedTickets, fetchIssuesByKeys } from "../api/jira-client";

export function useAssignedTickets() {
  const { data, isLoading, revalidate, error } = useCachedPromise(fetchAssignedTickets);
  return { tickets: data, isLoading, revalidate, error };
}

export function useIssuesByKeys(keys: string[]) {
  const { data, isLoading, revalidate, error } = useCachedPromise(
    async (issueKeys: string[]) => {
      if (issueKeys.length === 0) return [];
      return await fetchIssuesByKeys(issueKeys);
    },
    [keys]
  );
  return { issues: data, isLoading, revalidate, error };
}
