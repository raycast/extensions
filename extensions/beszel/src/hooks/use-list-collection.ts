import { captureException } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import type { ListResult } from "pocketbase";

import { usePreferences } from "./use-preferences";

export interface UseListCollectionOptions {
  /**
   * How many items to load per page.
   * Only set if not using raycasts pagination feature on a list view
   */
  perPage?: number;
  /**
   * @see https://pocketbase.io/docs/api-records/#listsearch-records
   * @example id='abc123'
   */
  filter?: string;
  /**
   * @see https://pocketbase.io/docs/api-records/#listsearch-records
   * @example -created
   */
  sort?: string;
  /**
   * @see https://pocketbase.io/docs/api-records/#listsearch-records
   * @example *,expand.relField.name
   */
  fields?: string;
}

export function useListCollection<T>(collection: string, options: UseListCollectionOptions = {}) {
  const preferences = usePreferences();

  const queryParams = new URLSearchParams();
  for (const key in options) {
    queryParams.set(key, String(options[key as keyof typeof options]));
  }

  return useFetch(
    (opts) => {
      queryParams.set("page", String(opts.page + 1)); // increment page as pages start with 1
      return `${new URL(`/api/collections/${collection}/records`, preferences.host)}?${queryParams.toString()}` satisfies RequestInfo;
    },
    {
      keepPreviousData: true,
      initialData: [],
      mapResult(result: ListResult<T>) {
        return {
          ...result,
          data: result.items,
          hasMore: result.page < result.totalPages,
        };
      },
      headers: {
        Authorization: `Bearer ${preferences.token}`,
      },
      async onError(error) {
        captureException(error);
        showFailureToast(error, {
          title: `Failed to ${collection} records`,
          message: error.message,
        });
      },
    },
  );
}
