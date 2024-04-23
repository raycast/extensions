import { useFetch } from "@raycast/utils";

import type { CachedPost, CachedPostResult } from "@/types/index";

export default function useCachedPosts(subdomain: string) {
  const { data, isLoading, error } = useFetch(
    `https://${subdomain}.substack.com/api/v1/publication/client-search-cache`,
    {
      parseResponse: async (res) => {
        const json = (await res.json()) as CachedPostResult;
        return json.posts.map((item) => ({
          ...item,
          _id: `${item.publication_id}_${item.slug}`,
        })) as (CachedPost & { _id: string })[];
      },
      initialData: [],
      keepPreviousData: true,
    },
  );

  return { data, isLoading, error };
}
