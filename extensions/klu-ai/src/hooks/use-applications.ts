import { useCachedPromise } from "@raycast/utils";
import klu from "../libs/klu";

const useApplications = () => {
  const hook = useCachedPromise(
    async () => {
      const workspace = await klu.workspaces.getCurrent();
      const apps = await klu.workspaces.getApps(workspace.projectGuid);

      const data = {
        apps: apps
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .sort((a, b) => {
            if (a.name < b.name) {
              return -1;
            }
            if (a.name > b.name) {
              return 1;
            }
            return 0;
          }),
        workspaceId: workspace.projectGuid,
      };

      return data;
    },
    [],
    {
      keepPreviousData: true,
      initialData: {
        apps: [],
        workspaceId: "",
      },
    },
  );

  return hook;
};

export default useApplications;
