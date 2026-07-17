import { showFailureToast } from "@raycast/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";

import { addConfluenceContentToFavorite, removeConfluenceContentFromFavorite } from "@/utils";
import type { ConfluenceContentSearchResponse } from "@/types";

export const useToggleConfluenceContentFavorite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contentId, isFavorited }: { contentId: string; isFavorited: boolean }) => {
      if (isFavorited) {
        await removeConfluenceContentFromFavorite({ contentId });
      } else {
        await addConfluenceContentToFavorite({ contentId });
      }
    },
    onMutate: async ({ contentId, isFavorited }) => {
      const queryKey = [{ scope: "confluence", entity: "search", type: "content" }];

      // Cancel all ongoing queries to avoid conflicts
      await queryClient.cancelQueries({ queryKey });

      // Get the current cached data of the query
      const previousData = queryClient.getQueriesData({ queryKey });

      // Optimistically update all related query caches
      queryClient.setQueriesData({ queryKey }, (old: InfiniteData<ConfluenceContentSearchResponse> | undefined) => {
        if (!old) return old;

        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            results: page.results.map((item) => updateContentItem(item, contentId, isFavorited)),
          })),
        };
      });

      // Return context for error rollback
      return { previousData };
    },
    onError: (error, _variables, context) => {
      showFailureToast(error, { title: "Failed to Update Favorite" });

      // Rollback to previous state on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Re-fetch data to ensure consistency regardless of success or failure
      queryClient.invalidateQueries({ queryKey: [{ scope: "confluence", entity: "search", type: "content" }] });
    },
  });
};

function updateContentItem(
  item: ConfluenceContentSearchResponse["results"][number],
  contentId: string,
  isFavorited: boolean,
): ConfluenceContentSearchResponse["results"][number] {
  if (item.id !== contentId) return item;

  return {
    ...item,
    metadata: {
      ...item.metadata,
      currentuser: {
        ...item.metadata.currentuser,
        favourited: {
          isFavourite: !isFavorited,
          favouritedDate: !isFavorited ? Date.now() : 0,
        },
      },
    },
  };
}
