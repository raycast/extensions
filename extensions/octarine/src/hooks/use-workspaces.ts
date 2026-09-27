import { Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import type { Workspace } from "@type/octarine";
import { getWorkspaces } from "@lib/workspaces";

export type LoadStatus = {
  isLoading: boolean;
  failed: boolean;
};

type Options = {
  refresh?: boolean;
  enabled?: boolean;
};

type Result = {
  workspaces: Workspace[];
  status: LoadStatus;
  revalidate: () => Promise<Workspace[]>;
};

export function useWorkspaces(options: Options = {}): Result {
  const refresh = options.refresh ?? false;
  const enabled = options.enabled ?? true;

  const {
    data: workspaces,
    error,
    isLoading,
    revalidate,
  } = usePromise(
    async (refresh: boolean) => {
      const workspaces = await getWorkspaces({ refresh });
      const invalid = workspaces.filter((workspace) => workspace.invalid).length;
      const visible = workspaces.filter((workspace) => !workspace.invalid && !workspace.ignored);

      if (invalid > 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid workspace root paths",
          message: `${invalid} paths could not be found`,
        });
      } else if (visible.length === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "No workspaces found",
          message: "Check root paths in preferences",
        });
      }

      return visible;
    },
    [refresh],
    {
      execute: enabled,
      onError: async () => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load workspaces",
        });
      },
      onData: () => {
        if (refresh) {
          showToast({
            style: Toast.Style.Success,
            title: "Workspaces refreshed",
          });
        }
      },
    },
  );

  return {
    workspaces: workspaces ?? [],
    status: {
      isLoading,
      failed: Boolean(error),
    },
    revalidate,
  };
}
