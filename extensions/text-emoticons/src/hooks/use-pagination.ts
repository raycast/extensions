import { usePromise } from "@raycast/utils";
import { getEmoticons } from "../utils/get-emoticons";
import { EmoticonCategory } from "../types/emoticons";

export const usePagination = (
  emoticonCategories: EmoticonCategory[],
  searchText: string,
  categorySlug: string,
) => {
  const {
    isLoading,
    data: paginatedEmoticons,
    pagination,
  } = usePromise(
    (searchText: string, categorySlug: string) =>
      async (options: { page: number }) => {
        const filteredEmoticons = getEmoticons(
          emoticonCategories,
          categorySlug,
          searchText,
        );

        const data = filteredEmoticons.slice(
          options.page === 0 ? 0 : options.page * 20 + 1,
          (options.page + 1) * 20,
        );

        return {
          data,
          hasMore: filteredEmoticons.length > (options.page + 1) * 20,
        };
      },
    [searchText, categorySlug],
  );

  return {
    isLoading,
    paginatedEmoticons,
    pagination,
  };
};
