import { useCachedPromise } from "@raycast/utils";
import klu from "../libs/klu";
import useWorkspace from "./use-workspace";

const useApplications = () => {
  const { data: workspace, isLoading: isWorkspaceLoading } = useWorkspace();

  const hook = useCachedPromise(
    async (workspaceProjectGuid) => {
      const apps = await klu.workspaces.getApps(workspaceProjectGuid);

      return apps;
    },
    [workspace.projectGuid],
    {
      execute: !isWorkspaceLoading || !workspace.projectGuid,
      keepPreviousData: true,
      initialData: [],
    },
  );

  return { ...hook, isLoading: isWorkspaceLoading || hook.isLoading };
};
export default useApplications;
