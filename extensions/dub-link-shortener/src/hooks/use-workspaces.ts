import { useCachedPromise } from "@raycast/utils";
import { getAllTags, getAllWorkspaces } from "@/api";
import { WorkspaceSchema } from "@/types";

export const useWorkspaces = () => {
  const {
    data: workspaces,
    isLoading: isLoadingWorkspaces,
    error,
  } = useCachedPromise(
    async () => {
      try {
        const workspaces = await getAllWorkspaces();
        return await Promise.all(
          workspaces.map(async (w) => {
            const tags = await getAllTags({ workspaceId: w.id });
            return { ...w, tags } as WorkspaceSchema;
          }),
        );
      } catch (err) {
        const tags = await getAllTags();
        return [{ tags } as WorkspaceSchema];
      }
    },
    [],
    {
      initialData: [],
      failureToastOptions: { title: "❗ Failed to fetch workspaces" },
    },
  );

  const isLoading = (!workspaces && !error) || isLoadingWorkspaces;
  const isSingleWorkspace = !isLoading && workspaces && workspaces.length === 1;

  return { workspaces, isLoading, error, isSingleWorkspace };
};
