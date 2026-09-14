import { useCachedPromise } from "@raycast/utils";

import { getLabels } from "../api/getLabels";
import { useWorkspaces } from "../components/WorkspaceContext";

export default function useLabels(teamId?: string, config?: { execute?: boolean }) {
  const { workspaceKey } = useWorkspaces();
  const { data, error, isLoading } = useCachedPromise(
    (key: string, teamId?: string) => getLabels(teamId),
    [workspaceKey, teamId],
    {
      execute: config?.execute !== false && !!teamId,
    },
  );

  return { labels: data, labelsError: error, isLoadingLabels: (!data && !error) || isLoading };
}
