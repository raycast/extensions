import { useCachedPromise } from "@raycast/utils";
import klu from "../libs/klu";
import { useCurrentWorkspace } from "./use-workspace";
import { useMemo } from "react";

const useApplications = () => {
  const { setWorkspace } = useCurrentWorkspace();
  const hook = useCachedPromise(
    async () => {
      const workspace = await klu.workspaces.getCurrent();
      setWorkspace(workspace);
      const apps = await klu.workspaces.getApps(workspace.projectGuid);
      return apps;
    },
    [],
    {
      keepPreviousData: true,
      initialData: undefined,
    },
  );

  return useMemo(() => hook, [hook]);
};
export default useApplications;
