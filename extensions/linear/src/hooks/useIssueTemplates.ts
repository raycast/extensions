import { useCachedPromise } from "@raycast/utils";

import { getIssueTemplates } from "../api/getIssueTemplates";
import { useWorkspaces } from "../components/WorkspaceContext";

export default function useIssueTemplates(teamId?: string, config?: { execute?: boolean }) {
  const { workspaceKey } = useWorkspaces();
  const { data, error, isLoading } = useCachedPromise(
    (key: string, teamId?: string) => getIssueTemplates(teamId),
    [workspaceKey, teamId],
    {
      execute: config?.execute !== false && !!teamId,
    },
  );

  return { issueTemplates: data, issueTemplatesError: error, isLoadingIssueTemplates: (!data && !error) || isLoading };
}
