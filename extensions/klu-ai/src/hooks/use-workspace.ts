import klu from "@/libs/klu";
import { PersistedWorkspace } from "@kluai/core";
import { environment } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useMemo } from "react";

export const useCurrentWorkspace = () => {
  const [workspace, setWorkspace] = useCachedState<PersistedWorkspace | undefined>(
    `${environment.extensionName}-current-workspace`,
    undefined,
  );

  return { workspace, setWorkspace };
};

const useWorkspace = () => {
  const { setWorkspace } = useCurrentWorkspace();

  const hook = useCachedPromise(
    async () => {
      const workspace = await klu.workspaces.getCurrent();

      return workspace;
    },
    [],
    {
      keepPreviousData: true,
      onData: (data) => {
        setWorkspace(data);
        return;
      },
    },
  );

  return useMemo(() => hook, [hook]);
};

export default useWorkspace;
