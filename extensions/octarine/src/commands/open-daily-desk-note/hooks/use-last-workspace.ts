import { useCallback } from "react";
import { Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import type { Workspace } from "@type/octarine";
import { clearLastWorkspace, getLastWorkspace, resolveLastWorkspace, saveLastWorkspace } from "../lib/last-workspace";

type Options = {
  workspaces: Workspace[];
  enabled?: boolean;
};

type Result = {
  workspace?: Workspace;
  isLoading: boolean;
  remember: (workspaceName: string) => Promise<void>;
  clear: () => Promise<void>;
};

export function useLastWorkspace({ workspaces, enabled = true }: Options): Result {
  const {
    data: storedWorkspaceName,
    isLoading,
    mutate,
  } = usePromise(getLastWorkspace, [], {
    execute: enabled,
  });
  const workspace = enabled ? resolveLastWorkspace(workspaces, storedWorkspaceName) : undefined;
  const remember = useCallback(
    async (workspaceName: string) => {
      if (!enabled) {
        return;
      }

      try {
        await mutate(
          saveLastWorkspace(workspaceName).then(() => workspaceName),
          {
            optimisticUpdate: () => workspaceName,
          },
        );
      } catch (error) {
        console.warn("Failed to save last workspace", error);
      }
    },
    [enabled, mutate],
  );

  const clear = useCallback(async () => {
    try {
      await mutate(clearLastWorkspace(), { optimisticUpdate: () => undefined });
      await showToast({
        style: Toast.Style.Success,
        title: "Last workspace cleared",
      });
    } catch (error) {
      console.error("Failed to clear last workspace", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Clear Last Workspace",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [mutate]);

  return {
    workspace,
    isLoading,
    remember,
    clear,
  };
}
