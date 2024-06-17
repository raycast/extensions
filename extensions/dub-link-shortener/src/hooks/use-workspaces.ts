import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getAllTags, getAllWorkspaces } from "../api";
import { captureException } from "@raycast/api";

export const useWorkspaces = () => {
  const {
    data: workspaces,
    revalidate,
    isLoading,
    error,
  } = useCachedPromise(
    async () => {
      const workspaces = await getAllWorkspaces();
      return await Promise.all(
        workspaces.map(async (w) => {
          const tags = await getAllTags({ workspaceId: w.id });
          return { ...w, tags };
        }),
      );
    },
    [],
    {
      initialData: [],
      onError: async (err) => {
        captureException(err);
        await showFailureToast(err, { title: "❗ Failed to fetch workspaces" });
        throw err;
      },
    },
  );

  return { workspaces, revalidate, isLoading: (!workspaces && !error) || isLoading, error };
};
