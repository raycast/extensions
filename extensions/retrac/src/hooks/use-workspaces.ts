import { useCachedPromise } from "@raycast/utils";
import { getAllTags, getAllWorkspaces } from "@/api";
import { WorkspaceSchema } from "@/types";

export const useWorkspaces = () => {
  const {
    data: workspaces,
    isLoading,
    error,
  } = useCachedPromise(
    async () => {
      const workspaces = await getAllWorkspaces();
      return await Promise.all(
        workspaces.map(async (w) => {
          const tags = await getAllTags({ workspaceId: w.id });
          return { ...w, tags } as WorkspaceSchema;
        }),
      );
    },
    [],
    {
      initialData: [],
      failureToastOptions: { title: "❗ Failed to fetch workspaces" },
    },
  );

  return { workspaces, isLoading: (!workspaces && !error) || isLoading, error };
};
