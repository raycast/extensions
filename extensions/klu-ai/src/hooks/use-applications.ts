import { useCachedPromise } from "@raycast/utils";
import klu from "../libs/klu";

const useApplications = () => {
  const hook = useCachedPromise(
    async () => {
      const workspace = await klu.workspaces.getCurrent();
      const apps = await klu.workspaces.getApps(workspace.projectGuid);
      return apps;
    },
    [],
    {
      keepPreviousData: true,
      initialData: undefined,
    },
  );

  return hook;
};
export default useApplications;
