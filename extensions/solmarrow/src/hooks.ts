import { showFailureToast, useCachedPromise, useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import { api } from "./api";

/** The workspaces you can use, and the one picked last time (remembered between runs). */
export function useWorkspace() {
  const { data: workspaces = [], isLoading } = useCachedPromise(() => api().workspaces(), [], {
    onError: (e) => {
      void showFailureToast(e, { title: "Couldn't load your workspaces" });
    },
  });
  const [workspaceId, setWorkspaceId] = useCachedState<string>("workspace-id", "");
  useEffect(() => {
    if (workspaces.length && !workspaces.some((w) => w.id === workspaceId)) setWorkspaceId(workspaces[0].id);
  }, [workspaces, workspaceId]);
  return { workspaces, workspaceId, setWorkspaceId, isLoading };
}
