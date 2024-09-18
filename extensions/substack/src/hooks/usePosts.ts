import { useFetch } from "@raycast/utils";

import type { Post } from "@/types";

export default function usePosts(userId: number) {
  const { data, isLoading, error } = useFetch(
    `https://substack.com/api/v1/profile/posts?profile_user_id=${userId}&offset=0&limit=20`,
    {
      parseResponse: async (res) => {
        const json = (await res.json()) as { posts: Post[] };
        return json.posts.map((item) => ({
          ...item,
          _id: `${item.id}_${item.slug}`,
        }));
      },
      initialData: [],
      keepPreviousData: true,
    },
  );

  return { data, isLoading, error };
}
