import { LocalStorage } from "@raycast/api";
import { apiRequest } from "@/functions/apiRequest";
import { useCachedPromise } from "@raycast/utils";
import { SearchResult, User } from "@/types";

export function useLikes() {
  const {
    isLoading: loading,
    data: likes,
    pagination,
    error,
  } = useCachedPromise(
    () => async (options: { page: number }) => {
      let username = await LocalStorage.getItem<string>("username");
      if (!username) {
        const user = await apiRequest<User>("/me", { requireUserAuth: true });
        await LocalStorage.setItem("username", user.username);
        username = user.username;
      }
      // /users/:username/likes is paginated (max 30 per page). Page lazily:
      // only the pages the user scrolls to get requested, so a large likes
      // library doesn't burn through the demo app's hourly rate limit on open.
      const page = options.page + 1;
      const perPage = 30;
      const pageLikes = await apiRequest<SearchResult[]>(`/users/${username}/likes?per_page=${perPage}&page=${page}`, {
        requireUserAuth: true,
      });
      return { data: pageLikes, hasMore: pageLikes.length === perPage };
    },
    [],
    {
      initialData: [] as SearchResult[],
      failureToastOptions: { title: "Failed to fetch likes." },
    },
  );
  return { loading, likes, pagination, error };
}

export default useLikes;
