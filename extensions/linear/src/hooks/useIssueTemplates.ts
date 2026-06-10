import { useCachedPromise } from "@raycast/utils";

import { getIssueTemplates } from "../api/getIssueTemplates";

export default function useIssueTemplates(teamId?: string, config?: { execute?: boolean }) {
  const { data, error, isLoading } = useCachedPromise(getIssueTemplates, [teamId], {
    execute: config?.execute !== false && !!teamId,
  });

  return { issueTemplates: data, issueTemplatesError: error, isLoadingIssueTemplates: (!data && !error) || isLoading };
}
