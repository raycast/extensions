import { usePromise } from "@raycast/utils";
import { collectionModels, listModels, searchModels } from "../lib/replicate";
import { DAY_MS, cached } from "../lib/cache";

export const useModels = (query: string, collection?: string) =>
  usePromise(
    (search: string, slug?: string) => {
      if (search.trim()) return searchModels(search.trim());
      if (slug) return cached(`collection:${slug}`, DAY_MS, () => collectionModels(slug));
      return cached("models:most-run-collections", DAY_MS, listModels);
    },
    [query, collection],
  );
