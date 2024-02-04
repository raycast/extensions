import klu from "@/libs/klu";
import { useCachedPromise } from "@raycast/utils";

const useWorkspace = () => {
  const hook = useCachedPromise(
    async () => {
      const workspace = await klu.workspaces.getCurrent();

      return workspace;
    },
    [],
    {
      keepPreviousData: true,
    },
  );

  return hook;
};

export default useWorkspace;
